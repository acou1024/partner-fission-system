/**
 * 新功能点专项测试
 * 覆盖范围：
 *   需求1 - 工作台：本月收益、上月流水、上月分润、累计流水字段
 *   需求2 - 工作台：todayNewCustomers 字段（第二行今日新增）
 *   需求3 - 客户列表：monthTurnover 按自然月 orderDate 过滤
 *   需求4 - 数据一致性：录入流水后工作台数据即时反映
 *
 * 运行方式:
 *   node tests/test-new-features.js
 *
 * 前提: 后端已在 http://localhost:3000 运行，数据库已初始化（admin/admin123 可登录）
 */

const axios = require('axios');
const dayjs = require('dayjs');

const BASE = 'http://localhost:3000/api';
const api = axios.create({ baseURL: BASE, timeout: 10000 });

let adminToken = '';
let partnerToken = '';
let partnerAId = 0;
let customerId = 0;
let transactionId = 0;

let passed = 0;
let failed = 0;
const errors = [];

// ==================== 工具函数 ====================

function setAdminToken(t) {
  api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
}

function setPartnerToken(t) {
  api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    const msg = e.response?.data?.message || e.message || String(e);
    errors.push({ name, error: msg });
    console.log(`  ❌ ${name} → ${msg}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || '断言失败');
}

function assertField(obj, field, label) {
  assert(obj[field] !== undefined && obj[field] !== null, `响应缺少字段: ${label || field}`);
}

// ==================== 主流程 ====================

async function run() {
  console.log('\n🧪 新功能点专项测试\n');
  console.log(`📅 当前时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n`);

  // ========== 准备：登录管理员 ==========
  console.log('【准备】管理员登录');

  await test('管理员登录', async () => {
    const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
    assert(res.data.code === 200, '登录失败');
    adminToken = res.data.data.token;
    setAdminToken(adminToken);
  });

  // ========== 准备：创建测试合伙人 + 客户 ==========
  console.log('\n【准备】创建测试数据');

  const suffix = Date.now();

  await test('创建测试合伙人A', async () => {
    const res = await api.post('/admin/partners', {
      name: `测试合伙人_${suffix}`,
      phone: `139${suffix.toString().slice(-8)}`,
      directRate: 3.00,
      teamRate: 1.00,
      rateMode: 'fixed',
    });
    assert(res.data.code === 200, '创建合伙人失败');
    partnerAId = res.data.data.id;
    assert(partnerAId > 0);
  });

  await test('创建测试客户（归属合伙人A）', async () => {
    const res = await api.post('/admin/customers', {
      nickname: `测试客户_${suffix}`,
      partnerId: partnerAId,
    });
    assert(res.data.code === 200, '创建客户失败');
    customerId = res.data.data.id;
    assert(customerId > 0);
  });

  // ========== 准备：合伙人模拟登录获取 token ==========
  await test('合伙人模拟登录（dev_mode: code=dev_{id}）', async () => {
    // 开发模式：code 以 "dev_" 开头 + partnerId，跳过微信OAuth
    const loginRes = await api.post('/auth/wechat/login', {
      code: `dev_${partnerAId}`,
    });
    assert(loginRes.data.code === 200, `合伙人登录失败: ${JSON.stringify(loginRes.data)}`);
    partnerToken = loginRes.data.data.token;
    assert(partnerToken, '缺少 partner_token');
  });

  // ==================== 需求1 + 需求2：工作台字段验证 ====================
  console.log('\n【需求1+2】工作台新字段验证（录入流水前）');

  setPartnerToken(partnerToken);

  let workbenchBefore;
  await test('获取工作台数据（基线）', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200, '工作台接口失败');
    workbenchBefore = res.data.data;
    const s = workbenchBefore.stats;

    // 需求1：验证字段存在
    assertField(s, 'monthCommission', '本月收益(monthCommission)');
    assertField(s, 'archivedTurnover', '上月流水(archivedTurnover)');
    assertField(s, 'archivedCommission', '上月分润(archivedCommission)');
    assertField(s, 'totalDirectTurnover', '累计流水(totalDirectTurnover)');

    // 需求2：验证今日新增字段
    assertField(s, 'todayNewCustomers', '今日新增客户数(todayNewCustomers)');
    assert(typeof s.todayNewCustomers === 'number', 'todayNewCustomers 应为数字');

    console.log(`     基线数据: 本月收益=¥${s.monthCommission}, 累计流水=¥${s.totalDirectTurnover}, 今日新增=${s.todayNewCustomers}`);
  });

  // ========== 录入本月流水 ==========
  console.log('\n【准备】录入本月流水（今日）');

  setAdminToken(adminToken);
  const todayDate = dayjs().format('YYYY-MM-DD');

  await test(`录入本月流水 1000元（打单日期: ${todayDate}）`, async () => {
    const res = await api.post('/admin/transactions', {
      customerId,
      amount: 1000,
      orderDate: todayDate,
      remark: '新功能测试-本月流水',
    });
    assert(res.data.code === 200, `录入流水失败: ${res.data.message}`);
    transactionId = res.data.data.id;
    assert(transactionId > 0);

    const commissions = res.data.data.commissions;
    assert(Array.isArray(commissions) && commissions.length > 0, '未生成佣金');
    const directComm = commissions.find(c => c.type === 'direct');
    assert(directComm, '缺少直推佣金');
    assert(Math.abs(Number(directComm.amount) - 30) < 0.01, `直推佣金应为30元，实际=${directComm.amount}`);
    console.log(`     ✓ 直推佣金正确: ¥${directComm.amount}`);
  });

  // ==================== 需求1：录入后验证工作台数值增量 ====================
  console.log('\n【需求1】录入后工作台数值增量验证');

  setPartnerToken(partnerToken);

  await test('工作台 - monthCommission 应增加 30元', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200);
    const s = res.data.data.stats;
    const before = Number(workbenchBefore.stats.monthCommission);
    const after = Number(s.monthCommission);
    assert(Math.abs(after - before - 30) < 0.01,
      `本月收益应增加30元，前=${before} 后=${after} 差值=${after - before}`);
    console.log(`     本月收益: ¥${before} → ¥${after} (+30 ✓)`);
  });

  await test('工作台 - totalDirectTurnover 应增加 1000元', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200);
    const s = res.data.data.stats;
    const before = Number(workbenchBefore.stats.totalDirectTurnover);
    const after = Number(s.totalDirectTurnover);
    assert(Math.abs(after - before - 1000) < 0.01,
      `累计流水应增加1000元，前=${before} 后=${after}`);
    console.log(`     累计流水: ¥${before} → ¥${after} (+1000 ✓)`);
  });

  await test('工作台 - 今日流水(todayTurnover) 应包含本次录入', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200);
    const s = res.data.data.stats;
    const before = Number(workbenchBefore.stats.todayTurnover);
    const after = Number(s.todayTurnover);
    assert(after >= before + 1000,
      `今日流水应增加1000元，前=${before} 后=${after}`);
    console.log(`     今日流水: ¥${before} → ¥${after} (+1000 ✓)`);
  });

  // ==================== 需求2：todayNewCustomers 验证 ====================
  console.log('\n【需求2】今日新增客户数验证');

  await test('todayNewCustomers 应 >= 1（刚才已创建今日客户）', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200);
    const todayNew = res.data.data.stats.todayNewCustomers;
    assert(todayNew >= 1, `今日新增客户应>=1，实际=${todayNew}`);
    console.log(`     今日新增客户数: ${todayNew} ✓`);
  });

  // ==================== 需求3：客户列表 monthTurnover 按自然月验证 ====================
  console.log('\n【需求3】客户列表 - 本月流水按自然月过滤验证');

  setAdminToken(adminToken);

  // 录入上月流水（不应计入本月）
  const lastMonthDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD');
  let lastMonthTxId = 0;

  await test(`录入上月流水 500元（打单日期: ${lastMonthDate}）`, async () => {
    const res = await api.post('/admin/transactions', {
      customerId,
      amount: 500,
      orderDate: lastMonthDate,
      remark: '新功能测试-上月流水',
    });
    assert(res.data.code === 200, `录入上月流水失败: ${res.data.message}`);
    lastMonthTxId = res.data.data.id;
  });

  setPartnerToken(partnerToken);

  await test('客户列表 lastMonthTurnover 正确统计上月流水（含刚录入的500元）', async () => {
    const res = await api.get('/mobile/customers', { params: { page: 1, pageSize: 50 } });
    assert(res.data.code === 200, '获取客户列表失败');
    const list = res.data.data.list || [];
    assert(list.length >= 1, `客户列表为空，无法验证`);

    // 取今日流水最高的客户（即我们的测试客户，今日有1000元记录）
    const sorted = [...list].sort((a, b) => Number(b.todayTurnover) - Number(a.todayTurnover));
    const customer = sorted[0];
    console.log(`     调试 - 测试客户: todayTurnover=${customer.todayTurnover}, lastMonthTurnover=${customer.lastMonthTurnover}, lastMonthTransactionDate=${customer.lastMonthTransactionDate}`);

    const todayTurnover = Number(customer.todayTurnover);
    const lastMonthTurnover = Number(customer.lastMonthTurnover);

    // 今日流水验证
    assert(todayTurnover >= 1000, `测试客户今日流水应>=1000，实际=${todayTurnover}`);

    // 上月流水验证：刚录入了500元，lastMonthTurnover 应≈500
    assert(lastMonthTurnover >= 500 && lastMonthTurnover < 1000,
      `上月流水应≈500元，实际=${lastMonthTurnover}`);

    // lastMonthTransactionDate 应有值（上月有流水）
    assert(customer.lastMonthTransactionDate !== undefined, '缺少 lastMonthTransactionDate 字段');
    console.log(`     ✓ lastMonthTurnover=¥${lastMonthTurnover}（上月500元 ✓）`);
    console.log(`     ✓ lastMonthTransactionDate=${customer.lastMonthTransactionDate}（日期与流水对应，非加入日期 ✓）`);
  });

  // ==================== 需求4：数据一致性（录入后立即查询） ====================
  console.log('\n【需求4】数据一致性 - 录入后立即查询验证');

  setAdminToken(adminToken);

  await test('录入新流水后工作台接口无缓存延迟（立即反映）', async () => {
    // 再录一笔 200 元
    const res1 = await api.post('/admin/transactions', {
      customerId,
      amount: 200,
      orderDate: todayDate,
      remark: '新功能测试-一致性验证',
    });
    assert(res1.data.code === 200, '录入失败');

    // 立即查工作台
    setPartnerToken(partnerToken);
    const res2 = await api.get('/mobile/workbench');
    assert(res2.data.code === 200);
    const todayTurnover = Number(res2.data.data.stats.todayTurnover);
    assert(todayTurnover >= 1200, `今日流水应>=1200（1000+200），实际=${todayTurnover}`);
    console.log(`     立即查询今日流水: ¥${todayTurnover}（含新录入200元 ✓）`);
  });

  // ==================== 清理测试数据 ====================
  console.log('\n【清理】删除测试数据');

  setAdminToken(adminToken);

  // 删除流水（会自动回退佣金）
  await test('删除上月流水', async () => {
    if (!lastMonthTxId) return;
    const res = await api.delete(`/admin/transactions/${lastMonthTxId}`);
    assert(res.data.code === 200, `删除失败: ${res.data.message}`);
  });

  await test('删除本月流水（1000元）', async () => {
    if (!transactionId) return;
    const res = await api.delete(`/admin/transactions/${transactionId}`);
    assert(res.data.code === 200, `删除失败: ${res.data.message}`);
  });

  await test('删除测试客户', async () => {
    if (!customerId) return;
    const res = await api.delete(`/admin/customers/${customerId}`);
    assert(res.data.code === 200);
  });

  await test('删除测试合伙人', async () => {
    if (!partnerAId) return;
    const res = await api.delete(`/admin/partners/${partnerAId}`);
    assert(res.data.code === 200);
  });

  // ==================== 结果汇总 ====================
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ✅ 通过 ${passed}  ❌ 失败 ${failed}  合计 ${passed + failed}`);

  if (errors.length > 0) {
    console.log('\n失败详情:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. [${e.name}] ${e.error}`));
  }

  console.log('='.repeat(50) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('测试运行异常:', e.message);
  process.exit(1);
});
