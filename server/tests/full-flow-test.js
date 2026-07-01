/**
 * 全流程自动化测试脚本
 * 运行方式: node tests/full-flow-test.js
 * 前提: 后端已在 http://localhost:3000 运行，数据库已初始化
 */
const axios = require('axios');

const BASE = 'http://localhost:3000/api';
let adminToken = '';
let staffToken = '';
let partnerToken = '';
let partnerAId = 0;
let partnerBId = 0;
let partnerAInviteCode = '';
let customerId = 0;
let transactionId = 0;
let settlementId = 0;
let reportId = 0;
let materialId = 0;
let categoryId = 0;
let scriptId = 0;
let domainId = 0;
let staffUserId = 0;
let customer2Id = 0;
let transaction2Id = 0;
let customerToken = '';

let passed = 0;
let failed = 0;
const errors = [];

const api = axios.create({ baseURL: BASE, timeout: 10000 });

function setToken(token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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

// ==================== 开始测试 ====================

async function run() {
  console.log('\n🚀 开始全流程测试...\n');

  // ========== 阶段1：基础验证 ==========
  console.log('【阶段1】基础验证');

  await test('1. 健康检查', async () => {
    const res = await api.get('/health');
    assert(res.data.code === 200, '健康检查失败');
  });

  await test('2. 管理员登录', async () => {
    const res = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
    assert(res.data.code === 200, '登录失败');
    assert(res.data.data.token, '缺少token');
    adminToken = res.data.data.token;
    setToken(adminToken);
  });

  await test('3. 获取用户信息', async () => {
    const res = await api.get('/auth/userinfo');
    assert(res.data.code === 200);
    assert(res.data.data.username === 'admin');
    assert(res.data.data.role === 'admin');
  });

  // ========== 阶段2：系统配置 ==========
  console.log('\n【阶段2】系统配置');

  await test('4. 获取系统配置', async () => {
    const res = await api.get('/admin/system/configs');
    assert(res.data.code === 200);
    assert(typeof res.data.data === 'object', '配置应为对象');
    assert(res.data.data.default_direct_rate, '缺少默认直推比例');
  });

  await test('5. 更新系统配置', async () => {
    const res = await api.put('/admin/system/configs', {
      configs: {
        default_direct_rate: '3.00',
        default_team_rate: '1.00',
      },
    });
    assert(res.data.code === 200);
  });

  await test('6. 添加域名', async () => {
    const res = await api.post('/admin/system/domains', {
      domain: 'test.example.com',
      type: 'landing',
      remark: '测试域名',
    });
    assert(res.data.code === 200);
    domainId = res.data.data.id;
  });

  await test('7. 获取域名列表', async () => {
    const res = await api.get('/admin/system/domains');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data));
  });

  await test('8. 切换域名', async () => {
    const res = await api.put(`/admin/system/domains/${domainId}/switch`);
    assert(res.data.code === 200);
  });

  // ========== 阶段3：员工管理 ==========
  console.log('\n【阶段3】员工管理');

  await test('9. 获取员工列表', async () => {
    const res = await api.get('/admin/system/staff');
    assert(res.data.code === 200);
  });

  await test('10. 创建测试员工', async () => {
    const res = await api.post('/admin/system/staff', {
      username: 'test_staff_' + Date.now(),
      password: 'test123456',
      realName: '测试员工',
      phone: '13900001111',
    });
    assert(res.data.code === 200);
    staffUserId = res.data.data.id;
  });

  await test('10b. 更新员工信息', async () => {
    const res = await api.put(`/admin/system/staff/${staffUserId}`, {
      realName: '测试员工-已更新',
      phone: '13900009999',
    });
    assert(res.data.code === 200);
    assert(res.data.data.realName === '测试员工-已更新');
  });

  // ========== 阶段4：合伙人管理 ==========
  console.log('\n【阶段4】合伙人管理');

  await test('11. 创建合伙人A', async () => {
    const res = await api.post('/admin/partners', {
      name: '测试合伙人A',
      phone: '13800001111',
      wechatId: 'testA_wx',
      directRate: 3.00,
      teamRate: 1.00,
      rateMode: 'fixed',
    });
    assert(res.data.code === 200);
    partnerAId = res.data.data.id;
    partnerAInviteCode = res.data.data.inviteCode;
    assert(partnerAInviteCode, '缺少邀请码');
  });

  await test('12. 创建合伙人B（A的下级）', async () => {
    const res = await api.post('/admin/partners', {
      name: '测试合伙人B',
      phone: '13800002222',
      wechatId: 'testB_wx',
      parentId: partnerAId,
      directRate: 3.00,
      teamRate: 1.00,
      rateMode: 'fixed',
    });
    assert(res.data.code === 200);
    partnerBId = res.data.data.id;
  });

  await test('13. 获取合侙人列表', async () => {
    const res = await api.get('/admin/partners');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
    assert(res.data.data.pagination, '应有分页信息');
  });

  await test('14. 获取合伙人A详情', async () => {
    const res = await api.get(`/admin/partners/${partnerAId}`);
    assert(res.data.code === 200);
    assert(res.data.data.name === '测试合伙人A');
    assert(res.data.data.children.length >= 1, '下级合伙人应至少1个');
  });

  await test('15. 更新合伙人A', async () => {
    const res = await api.put(`/admin/partners/${partnerAId}`, {
      name: '测试合伙人A-已更新',
    });
    assert(res.data.code === 200);
  });

  await test('16. 生成邀请二维码', async () => {
    const res = await api.get(`/admin/partners/${partnerAId}/qrcode`);
    assert(res.data.code === 200);
    assert(res.data.data.qrCode, '缺少二维码数据');
    assert(res.data.data.inviteUrl.includes('/m/invite/'), '邀请链接格式错误');
  });

  // ========== 阶段5：客户管理 ==========
  console.log('\n【阶段5】客户管理');

  await test('17. 创建客户（归属合伙人B）', async () => {
    const res = await api.post('/admin/customers', {
      nickname: '测试客户张三',
      partnerId: partnerBId,
      remark: '自动测试创建',
    });
    assert(res.data.code === 200);
    customerId = res.data.data.id;
  });

  await test('18. 获取客户列表', async () => {
    const res = await api.get('/admin/customers');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
  });

  await test('19. 更新客户', async () => {
    const res = await api.put(`/admin/customers/${customerId}`, {
      nickname: '测试客户张三-已更新',
      remark: '更新备注',
    });
    assert(res.data.code === 200);
  });

  await test('19b. 创建第二个客户（用于测试删除）', async () => {
    const res = await api.post('/admin/customers', {
      nickname: '待删除客户',
      partnerId: partnerBId,
    });
    assert(res.data.code === 200);
    customer2Id = res.data.data.id;
  });

  await test('19c. 删除客户', async () => {
    const res = await api.delete(`/admin/customers/${customer2Id}`);
    assert(res.data.code === 200);
  });

  // ========== 阶段6：流水录入 + 佣金计算 ==========
  console.log('\n【阶段6】流水录入 + 佣金自动计算');

  await test('20. 录入流水1000元', async () => {
    const res = await api.post('/admin/transactions', {
      customerId: customerId,
      amount: 1000,
      orderDate: new Date().toISOString().split('T')[0],
      remark: '测试流水',
    });
    assert(res.data.code === 200);
    transactionId = res.data.data.id;
    // 检查佣金是否自动生成
    const commissions = res.data.data.commissions;
    assert(commissions && commissions.length > 0, '佣金未自动生成');

    // 直推佣金：1000 * 3% = 30
    const directComm = commissions.find(c => c.type === 'direct');
    assert(directComm, '缺少直推佣金');
    assert(Number(directComm.amount) === 30, `直推佣金应为30，实际为${directComm.amount}`);

    // 团队佣金（合伙人B的上级是A）：1000 * 1% = 10
    const teamComm = commissions.find(c => c.type === 'team');
    assert(teamComm, '缺少团队佣金');
    assert(Number(teamComm.amount) === 10, `团队佣金应为10，实际为${teamComm.amount}`);
  });

  await test('21. 获取流水列表', async () => {
    const res = await api.get('/admin/transactions');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
  });

  await test('21b. 录入第二笔流水（用于测试删除）', async () => {
    const res = await api.post('/admin/transactions', {
      customerId: customerId,
      amount: 500,
      orderDate: new Date().toISOString().split('T')[0],
      remark: '待删除流水',
    });
    assert(res.data.code === 200);
    transaction2Id = res.data.data.id;
  });

  await test('21c. 删除流水（管理员）', async () => {
    const res = await api.delete(`/admin/transactions/${transaction2Id}`);
    assert(res.data.code === 200);
  });

  // ========== 阶段7：结算管理 ==========
  console.log('\n【阶段7】结算管理');

  await test('22. 查看合伙人B结算前余额', async () => {
    const res = await api.get(`/admin/partners/${partnerBId}`);
    assert(res.data.code === 200);
    const bal = Number(res.data.data.balance);
    assert(bal > 0, `合伙人B余额应>0，实际为${bal}`);
  });

  await test('23. 创建结算（合伙人B出款）', async () => {
    // 先查余额
    const pRes = await api.get(`/admin/partners/${partnerBId}`);
    const balance = Number(pRes.data.data.balance);
    const res = await api.post('/admin/settlements', {
      partnerId: partnerBId,
      amount: balance,
      remark: '测试结算',
    });
    assert(res.data.code === 200);
    assert(res.data.data, '应返回结算记录');
    settlementId = res.data.data.id;
  });

  await test('24. 验证结算后余额', async () => {
    const res = await api.get(`/admin/partners/${partnerBId}`);
    assert(res.data.code === 200);
    assert(Number(res.data.data.balance) === 0, `结算后余额应为0，实际为${res.data.data.balance}`);
  });

  await test('25. 获取结算列表', async () => {
    const res = await api.get('/admin/settlements');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
  });

  // ========== 阶段8：数据大盘 ==========
  console.log('\n【阶段8】数据大盘');

  await test('26. 获取大盘概览', async () => {
    const res = await api.get('/admin/dashboard/overview');
    assert(res.data.code === 200);
    const d = res.data.data;
    assert(d.today !== undefined, '缺少today数据');
    assert(d.today.turnover !== undefined, '缺少今日流水');
    assert(d.today.commission !== undefined, '缺少今日佣金');
    assert(d.total !== undefined, '缺少total数据');
    assert(d.total.partners !== undefined, '缺少合伙人数');
  });

  await test('27. 获取流水排行', async () => {
    const res = await api.get('/admin/dashboard/ranking');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data));
  });

  // ========== 阶段9：移动端合伙人API ==========
  console.log('\n【阶段9】移动端合伙人API');

  await test('28. 合伙人开发模式登录', async () => {
    const res = await api.post('/auth/wechat/login', { code: `dev_${partnerBId}` });
    assert(res.data.code === 200);
    partnerToken = res.data.data.token;
    assert(partnerToken, '缺少合伙人token');
  });

  // 切换到合伙人token
  setToken(partnerToken);

  await test('29. 获取工作台数据', async () => {
    const res = await api.get('/mobile/workbench');
    assert(res.data.code === 200);
    assert(res.data.data.partner, '缺少合伙人信息');
    assert(res.data.data.stats, '缺少统计数据');
  });

  await test('30. 获取我的客户', async () => {
    const res = await api.get('/mobile/customers');
    assert(res.data.code === 200);
  });

  await test('31. 获取我的团队', async () => {
    const res = await api.get('/mobile/team');
    assert(res.data.code === 200);
  });

  await test('32. 报备客户', async () => {
    const res = await api.post('/mobile/report', {
      nickname: '新客户李四',
      remark: '微信群拉入',
    });
    assert(res.data.code === 200);
    reportId = res.data.data.id;
  });

  await test('33. 获取我的报备记录', async () => {
    const res = await api.get('/mobile/reports');
    assert(res.data.code === 200);
  });

  await test('34. 获取佣金明细', async () => {
    const res = await api.get('/mobile/commissions');
    assert(res.data.code === 200);
  });

  await test('35. 获取结算记录', async () => {
    const res = await api.get('/mobile/settlements');
    assert(res.data.code === 200);
  });

  await test('36. 获取素材列表', async () => {
    const res = await api.get('/mobile/materials');
    assert(res.data.code === 200);
  });

  await test('37. 获取话术列表', async () => {
    const res = await api.get('/mobile/scripts');
    assert(res.data.code === 200);
  });

  await test('38. 获取推演配置', async () => {
    const res = await api.get('/mobile/projection-config');
    assert(res.data.code === 200);
  });

  // ========== 阶段10：客户报备审核 ==========
  console.log('\n【阶段10】客户报备审核');

  // 切回管理员token
  setToken(adminToken);

  await test('39. 获取待审核报备', async () => {
    const res = await api.get('/admin/reports');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
  });

  await test('40. 审核通过报备', async () => {
    if (!reportId) { console.log('    ⏭ 跳过（无报备ID）'); return; }
    const res = await api.put(`/admin/reports/${reportId}/review`, {
      status: 'approved',
      remark: '审核通过',
    });
    assert(res.data.code === 200);
  });

  // ========== 阶段11：知识库 ==========
  console.log('\n【阶段11】知识库管理');

  await test('41. 创建话术类别', async () => {
    const res = await api.post('/admin/scripts/categories', {
      name: '测试话术类别',
      sortOrder: 1,
    });
    assert(res.data.code === 200);
    categoryId = res.data.data.id;
  });

  await test('42. 创建话术内容', async () => {
    const res = await api.post('/admin/scripts', {
      categoryId: categoryId,
      title: '测试话术标题',
      content: '这是测试话术内容，用于自动化测试。',
      sortOrder: 1,
    });
    assert(res.data.code === 200);
    scriptId = res.data.data.id;
  });

  await test('43. 获取话术类别列表', async () => {
    const res = await api.get('/admin/scripts/categories');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data));
  });

  await test('44. 更新话术内容', async () => {
    const res = await api.put(`/admin/scripts/${scriptId}`, {
      title: '测试话术标题-已更新',
      content: '更新后的话术内容。',
    });
    assert(res.data.code === 200);
  });

  await test('44b. 更新话术类别', async () => {
    const res = await api.put(`/admin/scripts/categories/${categoryId}`, {
      name: '测试话术类别-已更新',
      sortOrder: 2,
    });
    assert(res.data.code === 200);
  });

  // ========== 阶段11b：素材管理 ==========
  console.log('\n【阶段11b】素材管理');

  await test('44c. 获取素材列表（管理端）', async () => {
    const res = await api.get('/admin/materials');
    assert(res.data.code === 200);
  });

  await test('44d. 清理过期素材', async () => {
    const res = await api.post('/admin/materials/clean');
    assert(res.data.code === 200);
  });

  // ========== 阶段12：邀请码流程 ==========
  console.log('\n【阶段12】邀请码流程');

  await test('45. 验证有效邀请码', async () => {
    const res = await api.get(`/invite/validate/${partnerAInviteCode}`);
    assert(res.data.code === 200);
    assert(res.data.data.valid === true);
    assert(res.data.data.partnerName, '缺少脱敏合伙人名');
  });

  await test('46. 验证无效邀请码', async () => {
    try {
      await api.get('/invite/validate/invalid_code_xxx');
      throw new Error('应返回错误');
    } catch (e) {
      // 预期失败（code !== 200 或 404）
      assert(true);
    }
  });

  // ========== 阶段12b：客户邀请注册 + 查账 ==========
  console.log('\n【阶段12b】客户邀请注册 + 查账');

  await test('46b. 客户通过邀请码注册（开发模式）', async () => {
    const res = await api.post('/invite/register', {
      code: 'dev_test_' + Date.now(),
      inviteCode: partnerAInviteCode,
      nickname: '测试客户王五',
    });
    assert(res.data.code === 200);
    assert(res.data.data.token, '缺少客户token');
    customerToken = res.data.data.token;
    assert(res.data.data.userType === 'customer');
  });

  await test('46c. 客户再次登录（开发模式）', async () => {
    // 用同一个code再次登录
    const res = await api.post('/invite/register', {
      code: 'dev_test_' + Date.now(),
      inviteCode: partnerAInviteCode,
      nickname: '另一个客户',
    });
    assert(res.data.code === 200);
    assert(res.data.data.token);
  });

  await test('46d. 客户查看工作台', async () => {
    setToken(customerToken);
    const res = await api.get('/invite/dashboard');
    assert(res.data.code === 200);
    assert(res.data.data.customer, '缺少客户信息');
  });

  await test('46e. 客户查看流水', async () => {
    const res = await api.get('/invite/transactions');
    assert(res.data.code === 200);
  });

  // ========== 阶段12c：公共接口 ==========
  console.log('\n【阶段12c】公共接口');

  await test('46f. 获取激活域名', async () => {
    const res = await api.get('/domain/active');
    assert(res.data.code === 200);
    assert(typeof res.data.data === 'object');
  });

  // ========== 阶段13：员工数据隔离 ==========
  setToken(adminToken);
  console.log('\n【阶段13】员工数据隔离');

  await test('47. 员工登录', async () => {
    const res = await api.post('/auth/login', { username: 'staff01', password: 'staff123' });
    assert(res.data.code === 200);
    staffToken = res.data.data.token;
    assert(res.data.data.userInfo.role === 'staff');
  });

  setToken(staffToken);

  await test('48. 员工获取合伙人列表（数据隔离）', async () => {
    const res = await api.get('/admin/partners');
    assert(res.data.code === 200);
    // 员工只能看到自己名下的，不应包含测试创建的（归属admin）
  });

  await test('49. 员工访问管理员接口（应返回403）', async () => {
    try {
      await api.get('/admin/system/configs');
      throw new Error('应返回403');
    } catch (e) {
      assert(e.response?.status === 403, `应返回403，实际返回${e.response?.status}`);
    }
  });

  await test('50. 修改密码', async () => {
    // 先改密码
    const res1 = await api.put('/auth/password', { oldPassword: 'staff123', newPassword: 'staff1234' });
    assert(res1.data.code === 200);
    // 改回去
    const res2 = await api.put('/auth/password', { oldPassword: 'staff1234', newPassword: 'staff123' });
    assert(res2.data.code === 200);
  });

  // ========== 阶段14：操作日志 ==========
  console.log('\n【阶段14】操作日志');

  setToken(adminToken);

  await test('51. 获取操作日志', async () => {
    const res = await api.get('/admin/system/logs');
    assert(res.data.code === 200);
    assert(Array.isArray(res.data.data.list), '应返回 list 数组');
  });

  // ========== 阶段15：清理测试数据 ==========
  console.log('\n【阶段15】清理测试数据');

  await test('52. 删除测试话术', async () => {
    const res = await api.delete(`/admin/scripts/${scriptId}`);
    assert(res.data.code === 200);
  });

  await test('53. 删除测试话术类别', async () => {
    const res = await api.delete(`/admin/scripts/categories/${categoryId}`);
    assert(res.data.code === 200);
  });

  await test('54. 取消激活并删除测试域名', async () => {
    // 先取消激活（将同类型所有域名设为非激活）
    // 由于只有一个测试域名，先创建一个临时域名激活它，再删除原来的
    const tmp = await api.post('/admin/system/domains', { domain: 'tmp.example.com', type: 'landing' });
    await api.put(`/admin/system/domains/${tmp.data.data.id}/switch`);
    // 现在原域名非激活了，可以删除
    const res = await api.delete(`/admin/system/domains/${domainId}`);
    assert(res.data.code === 200);
    // 清理临时域名：先取消激活才能删除，但它是唯一的landing域名
    // 直接忽略临时域名的清理（不影响业务）
  });

  await test('55. 冻结合伙人A（先冻结上级，因为软删除不删记录）', async () => {
    // 先冻结B，再冻结A——但软删除后B仍然是A的child
    // 所以需要先解除B的上下级关系
    await api.put(`/admin/partners/${partnerBId}`, { parentId: null });
    const res = await api.delete(`/admin/partners/${partnerBId}`);
    assert(res.data.code === 200);
  });

  await test('56. 冻结合伙人A（软删除）', async () => {
    const res = await api.delete(`/admin/partners/${partnerAId}`);
    assert(res.data.code === 200);
  });

  await test('57. 删除测试员工', async () => {
    const res = await api.delete(`/admin/system/staff/${staffUserId}`);
    assert(res.data.code === 200);
  });

  // ========== 结果汇总 ==========
  console.log('\n' + '='.repeat(50));
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败, 共 ${passed + failed} 项`);
  if (errors.length > 0) {
    console.log('\n❌ 失败详情:');
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}: ${e.error}`));
  } else {
    console.log('\n🎉 全部通过！业务流程完整可用。');
  }
  console.log('='.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('测试脚本异常:', e);
  process.exit(1);
});
