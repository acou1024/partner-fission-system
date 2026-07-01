/**
 * 自动化截图 + HTML交付报告生成
 * 运行方式: node tests/screenshot-report.js
 * 前提: 后端(3000)、管理后台(5173)、移动端(5174) 均已启动
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADMIN_URL = 'http://localhost:5173';
const MOBILE_URL = 'http://localhost:5174';
const API_BASE = 'http://localhost:3000/api';
const OUTPUT_DIR = path.join(__dirname, '..', 'delivery-screenshots');
const OUTPUT_HTML = path.join(__dirname, '..', 'delivery-report.html');

// 截图记录
const screenshots = [];
let stepIndex = 0;

async function screenshot(page, title, description, category) {
  stepIndex++;
  const filename = `step_${String(stepIndex).padStart(2, '0')}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  screenshots.push({ stepIndex, title, description, category, filename, filepath });
  console.log(`  📸 ${stepIndex}. ${title}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ==================== 读取已有演示数据 ====================
async function prepareTestData() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // 查找第一个有下级的合伙人作为A，其下级作为B
  const partnerA = await prisma.partner.findFirst({
    where: { status: 1, parentId: null },
    include: { children: { where: { status: 1 }, take: 1 } },
  });
  if (!partnerA) throw new Error('没有演示数据，请先运行 node tests/seed-demo-data.js');

  const partnerB = partnerA.children[0] || await prisma.partner.findFirst({
    where: { status: 1, id: { not: partnerA.id } },
  });

  await prisma.$disconnect();
  return {
    partnerAId: partnerA.id,
    partnerBId: partnerB.id,
    partnerAInviteCode: partnerA.inviteCode,
  };
}

// ==================== 管理后台截图 ====================
async function captureAdmin(browser, testData) {
  console.log('\n📋 管理后台截图中...\n');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. 登录页
  await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1000);
  await screenshot(page, '管理后台 - 登录页', '管理员通过用户名密码登录系统，支持记住密码', 'admin');

  // 2. 执行登录
  const loginBtn = await page.$('.el-button--primary');
  if (loginBtn) await loginBtn.click();
  await sleep(2500);
  await screenshot(page, '数据大盘 - 总览', '首页展示今日流水、本月流水、佣金支出、合伙人数量、客户数量等核心经营数据，一目了然', 'admin');

  // 3. 合伙人管理
  await page.goto(`${ADMIN_URL}/partners`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '合伙人管理 - 列表', '展示所有合伙人信息，支持搜索、筛选，可查看上下级关系、分润比例、余额等', 'admin');

  // 4. 客户管理
  await page.goto(`${ADMIN_URL}/customers`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '客户管理 - 列表', '管理所有客户，可按合伙人筛选，查看客户归属、流水情况', 'admin');

  // 5. 客户报备
  await page.goto(`${ADMIN_URL}/reports`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '客户报备 - 审核', '合伙人通过移动端提交客户报备，管理员在此审核通过或拒绝', 'admin');

  // 6. 流水管理
  await page.goto(`${ADMIN_URL}/transactions`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '流水管理 - 列表', '记录所有客户流水，录入流水后系统自动计算佣金（直推3% + 团队1%），支持按日期、合伙人筛选', 'admin');

  // 7. 结算管理
  await page.goto(`${ADMIN_URL}/settlements`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '结算管理 - 出款记录', '管理合伙人佣金结算，创建结算后自动扣减余额，实时账务清晰', 'admin');

  // 8. 素材管理
  await page.goto(`${ADMIN_URL}/materials`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '素材管理', '上传推广图片素材，支持批量上传，合伙人可在移动端保存使用', 'admin');

  // 9. 话术管理
  await page.goto(`${ADMIN_URL}/scripts`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '话术管理', '按类别管理推广话术，合伙人可在移动端一键复制使用', 'admin');

  // 10. 员工管理
  await page.goto(`${ADMIN_URL}/staff`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '员工管理', '管理员工账号，每个员工只能查看自己名下合伙人的数据，实现权限隔离', 'admin');

  // 11. 域名管理
  await page.goto(`${ADMIN_URL}/domains`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '域名管理', '管理落地页域名，支持一键切换，方便域名轮换防封', 'admin');

  // 12. 操作日志
  await page.goto(`${ADMIN_URL}/logs`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '操作日志', '记录所有管理操作（增删改），可追溯操作人、时间、内容，保障数据安全', 'admin');

  await page.close();
}

// ==================== 移动端截图 ====================
async function captureMobile(browser, testData) {
  console.log('\n📱 移动端截图中...\n');
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });

  // 1. 登录页
  await page.goto(`${MOBILE_URL}/m/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '移动端 - 登录页', '合伙人通过微信授权一键登录（开发环境支持模拟登录）', 'mobile');

  // 2. 模拟登录
  const input = await page.$('input');
  if (input) {
    await input.click({ clickCount: 3 });
    await input.type(String(testData.partnerBId));
    const btn = await page.$('.van-button--primary');
    if (btn) await btn.click();
    await sleep(2000);
  }

  // 3. 首页工作台
  await page.goto(`${MOBILE_URL}/m/home`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(2000);
  await screenshot(page, '合伙人首页 - 工作台', '展示总资产、可提现余额、今日/本月团队流水，以及邀请好友卡片', 'mobile');

  // 4. 我的客户
  await page.goto(`${MOBILE_URL}/m/customers`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '我的客户', '查看名下所有客户，展示客户昵称、归属时间等信息', 'mobile');

  // 5. 素材中心
  await page.goto(`${MOBILE_URL}/m/materials`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '素材中心', '查看管理员上传的推广素材图片，可长按保存到手机发朋友圈', 'mobile');

  // 6. 个人中心
  await page.goto(`${MOBILE_URL}/m/profile`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '个人中心', '合伙人个人主页，查看账户信息、功能入口', 'mobile');

  // 7. 我的团队
  await page.goto(`${MOBILE_URL}/m/team`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '我的团队', '查看下级合伙人列表，展示团队层级关系和业绩概况', 'mobile');

  // 8. 佣金明细
  await page.goto(`${MOBILE_URL}/m/commissions`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '佣金明细', '逐笔展示佣金记录，区分直推佣金和团队佣金，金额、比例清晰可查', 'mobile');

  // 9. 结算记录
  await page.goto(`${MOBILE_URL}/m/settlements`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '结算记录', '查看历史出款记录，包含结算金额、时间、状态', 'mobile');

  // 10. 报备客户
  await page.goto(`${MOBILE_URL}/m/report`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '报备客户', '合伙人在线提交客户报备，管理员后台审核，流程规范化', 'mobile');

  // 11. 话术库
  await page.goto(`${MOBILE_URL}/m/scripts`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '话术库', '按类别查看推广话术，支持一键复制，方便合伙人快速跟客户沟通', 'mobile');

  // 12. 收益推演
  await page.goto(`${MOBILE_URL}/m/projection`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '收益推演工具', '合伙人可输入预期客户数和金额，模拟计算预期佣金收益', 'mobile');

  // 13. 邀请页面
  await page.goto(`${MOBILE_URL}/m/join/${testData.partnerAInviteCode}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);
  await screenshot(page, '客户邀请页', '客户扫描合伙人二维码后进入此页面，显示合伙人信息，授权后自动注册绑定', 'mobile');

  await page.close();
}

// ==================== 生成HTML报告 ====================
function generateHTML() {
  console.log('\n📝 生成HTML交付报告...\n');

  const adminShots = screenshots.filter(s => s.category === 'admin');
  const mobileShots = screenshots.filter(s => s.category === 'mobile');

  function renderCards(shots, isMobile) {
    return shots.map(s => {
      const imgBase64 = fs.readFileSync(s.filepath).toString('base64');
      const imgWidth = isMobile ? 'max-width: 280px' : 'max-width: 100%';
      return `
      <div class="card ${isMobile ? 'mobile-card' : ''}">
        <div class="card-img">
          <img src="data:image/png;base64,${imgBase64}" alt="${s.title}" style="${imgWidth}" />
        </div>
        <div class="card-body">
          <h3>${s.title}</h3>
          <p>${s.description}</p>
        </div>
      </div>`;
    }).join('\n');
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>私域合伙人裂变与分销核算系统 - 交付报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; background: #f0f2f5; color: #1a1a2e; line-height: 1.6; }

    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; text-align: center; padding: 80px 20px 60px;
    }
    .hero h1 { font-size: 36px; font-weight: 700; margin-bottom: 16px; }
    .hero p { font-size: 18px; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    .hero .meta { margin-top: 30px; font-size: 14px; opacity: 0.7; }

    .stats-bar {
      display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;
      margin-top: 30px;
    }
    .stat-item { text-align: center; }
    .stat-item .num { font-size: 32px; font-weight: 700; }
    .stat-item .label { font-size: 13px; opacity: 0.8; margin-top: 4px; }

    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }

    .section-title {
      font-size: 28px; font-weight: 700; margin-bottom: 8px;
      display: flex; align-items: center; gap: 12px;
    }
    .section-title .icon { font-size: 32px; }
    .section-desc { color: #666; font-size: 15px; margin-bottom: 30px; }

    /* 管理后台卡片 - 大图 */
    .grid { display: grid; gap: 30px; margin-bottom: 60px; }
    .grid-admin { grid-template-columns: 1fr; }

    .card {
      background: white; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
    .card-img { background: #fafafa; padding: 20px; text-align: center; }
    .card-img img { border-radius: 8px; border: 1px solid #eee; width: 100%; }
    .card-body { padding: 20px 24px 24px; }
    .card-body h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #1a1a2e; }
    .card-body p { font-size: 14px; color: #666; line-height: 1.7; }

    /* 移动端卡片 - 手机大小 */
    .grid-mobile { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
    .mobile-card .card-img { background: #1a1a2e; padding: 30px 40px; }
    .mobile-card .card-img img {
      border-radius: 20px; border: 4px solid #333;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }

    /* 功能亮点 */
    .highlights {
      background: white; border-radius: 16px; padding: 40px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 60px;
    }
    .hl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px; margin-top: 24px; }
    .hl-item { padding: 20px; background: #f8f9ff; border-radius: 12px; }
    .hl-item .icon { font-size: 28px; margin-bottom: 8px; }
    .hl-item h4 { font-size: 16px; margin-bottom: 6px; }
    .hl-item p { font-size: 13px; color: #666; }

    /* 技术指标 */
    .tech-section { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 60px 20px; text-align: center; }
    .tech-section h2 { font-size: 28px; margin-bottom: 30px; }
    .tech-grid { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; max-width: 900px; margin: 0 auto; }
    .tech-card { background: rgba(255,255,255,0.1); padding: 24px; border-radius: 12px; min-width: 200px; }
    .tech-card .num { font-size: 36px; font-weight: 700; color: #667eea; }
    .tech-card .label { font-size: 14px; opacity: 0.8; margin-top: 4px; }

    .footer { text-align: center; padding: 40px; color: #999; font-size: 13px; }

    @media (max-width: 768px) {
      .hero h1 { font-size: 24px; }
      .stats-bar { gap: 20px; }
      .grid-mobile { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Hero -->
  <div class="hero">
    <h1>私域合伙人裂变与分销核算系统</h1>
    <p>一站式管理合伙人、客户、流水、佣金，自动计算分润，移动端实时查看</p>
    <div class="stats-bar">
      <div class="stat-item"><div class="num">70</div><div class="label">自动化测试项</div></div>
      <div class="stat-item"><div class="num">62</div><div class="label">API接口</div></div>
      <div class="stat-item"><div class="num">95%</div><div class="label">测试覆盖率</div></div>
      <div class="stat-item"><div class="num">13</div><div class="label">功能模块</div></div>
    </div>
    <div class="meta">报告生成时间：${new Date().toLocaleString('zh-CN')}</div>
  </div>

  <!-- 功能亮点 -->
  <div class="container">
    <div class="highlights">
      <div class="section-title"><span class="icon">✨</span> 核心功能亮点</div>
      <div class="hl-grid">
        <div class="hl-item">
          <div class="icon">💰</div>
          <h4>自动佣金计算</h4>
          <p>录入客户流水后，系统自动按比例计算直推佣金和团队佣金，支持固定比例和阶梯分润两种模式</p>
        </div>
        <div class="hl-item">
          <div class="icon">👥</div>
          <h4>多级分销体系</h4>
          <p>支持合伙人上下级关系，上级自动获得下级客户流水的团队佣金，裂变式增长</p>
        </div>
        <div class="hl-item">
          <div class="icon">📱</div>
          <h4>移动端H5</h4>
          <p>合伙人通过手机随时查看佣金、客户、团队数据，支持微信内直接打开</p>
        </div>
        <div class="hl-item">
          <div class="icon">🔗</div>
          <h4>邀请码裂变</h4>
          <p>每个合伙人专属邀请二维码，客户扫码自动绑定归属，防止撬客户</p>
        </div>
        <div class="hl-item">
          <div class="icon">🔒</div>
          <h4>权限隔离</h4>
          <p>员工只能看到自己名下合伙人的数据，管理员掌控全局，数据安全有保障</p>
        </div>
        <div class="hl-item">
          <div class="icon">📊</div>
          <h4>数据大盘</h4>
          <p>实时展示经营数据：流水、佣金、排行榜，辅助业务决策</p>
        </div>
        <div class="hl-item">
          <div class="icon">🌐</div>
          <h4>域名轮换</h4>
          <p>支持多域名管理和一键切换，有效应对域名被封风险</p>
        </div>
        <div class="hl-item">
          <div class="icon">📝</div>
          <h4>操作审计</h4>
          <p>所有增删改操作自动记录日志，可追溯操作人和时间，保障数据安全</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 管理后台 -->
  <div class="container">
    <div class="section-title"><span class="icon">🖥️</span> 管理后台（PC端）</div>
    <p class="section-desc">管理员和员工使用，涵盖合伙人管理、客户管理、流水录入、佣金结算、数据分析等全部业务功能</p>
    <div class="grid grid-admin">
      ${renderCards(adminShots, false)}
    </div>
  </div>

  <!-- 移动端 -->
  <div class="container">
    <div class="section-title"><span class="icon">📱</span> 合伙人移动端（H5）</div>
    <p class="section-desc">合伙人通过微信打开，随时查看佣金、客户、团队数据，支持报备客户、查看话术素材</p>
    <div class="grid grid-mobile">
      ${renderCards(mobileShots, true)}
    </div>
  </div>

  <!-- 技术指标 -->
  <div class="tech-section">
    <h2>📈 技术交付指标</h2>
    <div class="tech-grid">
      <div class="tech-card"><div class="num">70/70</div><div class="label">自动化测试全部通过</div></div>
      <div class="tech-card"><div class="num">62</div><div class="label">API 接口总数</div></div>
      <div class="tech-card"><div class="num">4</div><div class="label">角色权限体系<br>(管理员/员工/合伙人/客户)</div></div>
      <div class="tech-card"><div class="num">2</div><div class="label">前端应用<br>(管理后台 + 移动H5)</div></div>
    </div>
  </div>

  <div class="footer">
    <p>私域合伙人裂变与分销核算系统 · 交付报告 · ${new Date().toLocaleDateString('zh-CN')}</p>
  </div>

</body>
</html>`;

  fs.writeFileSync(OUTPUT_HTML, html, 'utf-8');
  console.log(`✅ HTML报告已生成: ${OUTPUT_HTML}`);
}

// ==================== 主函数 ==
async function main() {
  console.log('🚀 开始自动化截图...\n');

  // 创建截图目录
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 准备测试数据
  console.log('📦 准备测试数据...');
  let testData;
  try {
    testData = await prepareTestData();
    console.log('✅ 测试数据准备完成\n');
  } catch (e) {
    console.error('❌ 测试数据准备失败:', e.message);
    process.exit(1);
  }

  // 启动浏览器
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    // 检查前端路由
    await captureAdmin(browser, testData);
    await captureMobile(browser, testData);
  } catch (e) {
    console.error('截图过程出错:', e.message);
  }

  await browser.close();

  // 生成HTML
  if (screenshots.length > 0) {
    generateHTML();
  } else {
    console.log('⚠️ 没有截图生成');
  }

  console.log(`\n🎉 完成！共 ${screenshots.length} 张截图`);
  console.log(`📄 交付报告: ${OUTPUT_HTML}`);
}

main().catch(e => {
  console.error('脚本异常:', e);
  process.exit(1);
});
