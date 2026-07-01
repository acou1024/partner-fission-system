/**
 * 清理所有业务数据 + 创建演示数据
 * 运行方式: node tests/seed-demo-data.js
 * 前提: 后端数据库已连接
 */
const { PrismaClient, Prisma } = require('@prisma/client');
const { nanoid } = require('nanoid');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 开始清理所有业务数据...\n');

  // 按外键依赖顺序删除
  await prisma.operationLog.deleteMany();
  console.log('  ✅ 操作日志已清空');
  await prisma.commission.deleteMany();
  console.log('  ✅ 佣金记录已清空');
  await prisma.settlement.deleteMany();
  console.log('  ✅ 结算记录已清空');
  await prisma.transaction.deleteMany();
  console.log('  ✅ 流水记录已清空');
  await prisma.customerReport.deleteMany();
  console.log('  ✅ 客户报备已清空');
  await prisma.customer.deleteMany();
  console.log('  ✅ 客户数据已清空');
  await prisma.partner.deleteMany();
  console.log('  ✅ 合伙人数据已清空');
  await prisma.scriptContent.deleteMany();
  console.log('  ✅ 话术内容已清空');
  await prisma.scriptCategory.deleteMany();
  console.log('  ✅ 话术类别已清空');
  await prisma.material.deleteMany();
  console.log('  ✅ 素材数据已清空');
  await prisma.domainConfig.deleteMany();
  console.log('  ✅ 域名配置已清空');
  // 保留 SysUser（admin/staff01）和 SystemConfig

  console.log('\n📦 开始创建演示数据...\n');

  // ==================== 域名配置 ====================
  await prisma.domainConfig.create({
    data: { domain: 'h5.example.com', type: 'landing', isActive: 1, remark: '主落地域名' },
  });
  await prisma.domainConfig.create({
    data: { domain: 'h5-backup.example.com', type: 'landing', isActive: 0, remark: '备用落地域名' },
  });
  console.log('  ✅ 域名配置（2条）');

  // ==================== 合伙人 ====================
  const adminUser = await prisma.sysUser.findFirst({ where: { role: 'admin' } });
  const defaultStaffId = adminUser.id;

  const partnerA = await prisma.partner.create({
    data: {
      name: '陈志远', phone: '13812345678', wechatId: 'chenzy_wx',
      inviteCode: nanoid(12), staffId: defaultStaffId,
      directRate: new Prisma.Decimal(3.00), teamRate: new Prisma.Decimal(1.00),
      rateMode: 'fixed', balance: new Prisma.Decimal(0), status: 1,
    },
  });

  const partnerB = await prisma.partner.create({
    data: {
      name: '王丽华', phone: '13987654321', wechatId: 'wanglh_wx',
      inviteCode: nanoid(12), parentId: partnerA.id, staffId: defaultStaffId,
      directRate: new Prisma.Decimal(3.00), teamRate: new Prisma.Decimal(1.00),
      rateMode: 'fixed', balance: new Prisma.Decimal(0), status: 1,
    },
  });

  const partnerC = await prisma.partner.create({
    data: {
      name: '刘建国', phone: '13611112222', wechatId: 'liujg_wx',
      inviteCode: nanoid(12), parentId: partnerA.id, staffId: defaultStaffId,
      directRate: new Prisma.Decimal(3.00), teamRate: new Prisma.Decimal(1.00),
      rateMode: 'fixed', balance: new Prisma.Decimal(0), status: 1,
    },
  });

  const partnerD = await prisma.partner.create({
    data: {
      name: '赵雪梅', phone: '13722223333', wechatId: 'zhaoxm_wx',
      inviteCode: nanoid(12), parentId: partnerB.id, staffId: defaultStaffId,
      directRate: new Prisma.Decimal(2.50), teamRate: new Prisma.Decimal(0.80),
      rateMode: 'fixed', balance: new Prisma.Decimal(0), status: 1,
    },
  });

  const partnerE = await prisma.partner.create({
    data: {
      name: '孙伟明', phone: '13833334444', wechatId: 'sunwm_wx',
      inviteCode: nanoid(12), staffId: defaultStaffId,
      directRate: new Prisma.Decimal(3.00), teamRate: new Prisma.Decimal(1.00),
      rateMode: 'fixed', balance: new Prisma.Decimal(0), status: 1,
    },
  });

  console.log('  ✅ 合伙人（5位：陈志远→王丽华/刘建国→赵雪梅，独立：孙伟明）');

  // 分配员工
  const staff = await prisma.sysUser.findFirst({ where: { role: 'staff' } });
  if (staff) {
    await prisma.partner.update({ where: { id: partnerE.id }, data: { staffId: staff.id } });
    console.log(`  ✅ 孙伟明分配给员工 ${staff.realName}`);
  }

  // ==================== 客户 ====================
  const customers = [];
  const customerData = [
    { nickname: '张先生', partnerId: partnerB.id, remark: 'VIP客户，长期合作' },
    { nickname: '李女士', partnerId: partnerB.id, remark: '朋友推荐' },
    { nickname: '王总', partnerId: partnerC.id, remark: '企业客户' },
    { nickname: '赵小姐', partnerId: partnerC.id, remark: '微信群拉入' },
    { nickname: '钱先生', partnerId: partnerD.id, remark: '老客户介绍' },
    { nickname: '周女士', partnerId: partnerA.id, remark: '直接联系' },
    { nickname: '吴老板', partnerId: partnerA.id, remark: '商会认识' },
    { nickname: '郑先生', partnerId: partnerE.id, remark: '线上引流' },
    { nickname: '冯女士', partnerId: partnerE.id, remark: '朋友圈广告' },
    { nickname: '陈小姐', partnerId: partnerB.id, remark: '转介绍客户' },
  ];

  for (const cd of customerData) {
    const c = await prisma.customer.create({ data: cd });
    customers.push(c);
  }
  console.log('  ✅ 客户（10位，分布在各合伙人名下）');

  // ==================== 流水 + 佣金 ====================
  const today = new Date();
  const txData = [
    // 今天的流水
    { customerId: customers[0].id, amount: 50000, remark: '购买理财产品A', daysAgo: 0 },
    { customerId: customers[1].id, amount: 30000, remark: '定期存款', daysAgo: 0 },
    { customerId: customers[2].id, amount: 80000, remark: '企业融资对接', daysAgo: 0 },
    { customerId: customers[5].id, amount: 25000, remark: '基金定投', daysAgo: 0 },
    { customerId: customers[7].id, amount: 15000, remark: '保险产品', daysAgo: 0 },
    // 昨天
    { customerId: customers[0].id, amount: 20000, remark: '追加投资', daysAgo: 1 },
    { customerId: customers[3].id, amount: 45000, remark: '信托产品', daysAgo: 1 },
    { customerId: customers[4].id, amount: 12000, remark: '基金申购', daysAgo: 1 },
    // 3天前
    { customerId: customers[6].id, amount: 100000, remark: '大额理财', daysAgo: 3 },
    { customerId: customers[9].id, amount: 35000, remark: '定期理财', daysAgo: 3 },
    // 一周前
    { customerId: customers[2].id, amount: 60000, remark: '二次投资', daysAgo: 7 },
    { customerId: customers[8].id, amount: 28000, remark: '银行理财', daysAgo: 7 },
    // 半个月前
    { customerId: customers[5].id, amount: 40000, remark: '股权投资', daysAgo: 15 },
    { customerId: customers[1].id, amount: 55000, remark: '私募基金', daysAgo: 15 },
    // 一个月前
    { customerId: customers[3].id, amount: 70000, remark: '信托追加', daysAgo: 30 },
    { customerId: customers[6].id, amount: 90000, remark: '定期理财到期续投', daysAgo: 30 },
  ];

  // 查找 admin 用户作为 operator
  const admin = await prisma.sysUser.findFirst({ where: { role: 'admin' } });

  for (const tx of txData) {
    const orderDate = new Date(today);
    orderDate.setDate(orderDate.getDate() - tx.daysAgo);

    // 查客户归属的合伙人
    const customer = await prisma.customer.findUnique({
      where: { id: tx.customerId },
      include: { partner: { include: { parent: true } } },
    });

    const transaction = await prisma.transaction.create({
      data: {
        customerId: tx.customerId,
        amount: new Prisma.Decimal(tx.amount),
        orderDate,
        remark: tx.remark,
        operatorId: admin ? admin.id : 1,
      },
    });

    // 直推佣金
    const directRate = Number(customer.partner.directRate) / 100;
    const directAmount = tx.amount * directRate;
    await prisma.commission.create({
      data: {
        transactionId: transaction.id,
        partnerId: customer.partner.id,
        amount: new Prisma.Decimal(directAmount),
        rate: customer.partner.directRate,
        type: 'direct',
        settled: 0,
      },
    });

    // 更新合伙人余额
    await prisma.partner.update({
      where: { id: customer.partner.id },
      data: { balance: { increment: new Prisma.Decimal(directAmount) } },
    });

    // 团队佣金（上级）
    if (customer.partner.parent) {
      const teamRate = Number(customer.partner.parent.teamRate) / 100;
      const teamAmount = tx.amount * teamRate;
      await prisma.commission.create({
        data: {
          transactionId: transaction.id,
          partnerId: customer.partner.parent.id,
          amount: new Prisma.Decimal(teamAmount),
          rate: customer.partner.parent.teamRate,
          type: 'team',
          settled: 0,
        },
      });
      await prisma.partner.update({
        where: { id: customer.partner.parent.id },
        data: { balance: { increment: new Prisma.Decimal(teamAmount) } },
      });
    }
  }
  console.log('  ✅ 流水（16笔，跨度1个月）+ 佣金自动计算');

  // 部分结算
  const partnerBBalance = await prisma.partner.findUnique({ where: { id: partnerB.id } });
  const settleAmount = Math.floor(Number(partnerBBalance.balance) * 0.6); // 结算60%
  if (settleAmount > 0) {
    await prisma.settlement.create({
      data: {
        partnerId: partnerB.id,
        amount: new Prisma.Decimal(settleAmount),
        remark: '本月第一笔结算',
      },
    });
    await prisma.partner.update({
      where: { id: partnerB.id },
      data: { balance: { decrement: new Prisma.Decimal(settleAmount) } },
    });
    await prisma.commission.updateMany({
      where: { partnerId: partnerB.id, settled: 0 },
      data: { settled: 1 },
    });
  }
  console.log('  ✅ 结算记录（王丽华已结算一笔）');

  // ==================== 客户报备 ====================
  await prisma.customerReport.create({
    data: {
      partnerId: partnerC.id, nickname: '黄先生',
      remark: '同事介绍，有投资意向', status: 'approved',
    },
  });
  await prisma.customerReport.create({
    data: {
      partnerId: partnerD.id, nickname: '林女士',
      remark: '微信好友，咨询理财产品', status: 'pending',
    },
  });
  await prisma.customerReport.create({
    data: {
      partnerId: partnerB.id, nickname: '许先生',
      remark: '朋友圈看到广告，主动咨询', status: 'pending',
    },
  });
  console.log('  ✅ 客户报备（3条：1条已审核，2条待审核）');

  // ==================== 话术 ====================
  const cat1 = await prisma.scriptCategory.create({
    data: { name: '开场白', sortOrder: 1 },
  });
  const cat2 = await prisma.scriptCategory.create({
    data: { name: '产品介绍', sortOrder: 2 },
  });
  const cat3 = await prisma.scriptCategory.create({
    data: { name: '异议处理', sortOrder: 3 },
  });
  const cat4 = await prisma.scriptCategory.create({
    data: { name: '促单话术', sortOrder: 4 },
  });

  const scripts = [
    { categoryId: cat1.id, title: '首次接触', content: '您好，我是XX理财顾问，很高兴认识您。我们平台目前有一款非常适合稳健型投资者的产品，年化收益6%-8%，想了解一下吗？', sortOrder: 1 },
    { categoryId: cat1.id, title: '朋友圈引流', content: '看到您也关注理财，我们最近有个内部活动，首次投资额外赠送0.5%年化收益加成，限时名额，要不要我给您留一个？', sortOrder: 2 },
    { categoryId: cat2.id, title: '稳健型产品', content: '这款产品是银行存管、风控严格，历史年化收益6.5%，按月付息，最低1万起投，期限灵活可选3/6/12个月。', sortOrder: 1 },
    { categoryId: cat2.id, title: '高收益产品', content: '如果您追求更高收益，可以看看我们的信托计划，100万起投，预期年化8%-10%，由知名信托公司发行。', sortOrder: 2 },
    { categoryId: cat3.id, title: '担心风险', content: '完全理解您的顾虑。我们产品都有银行存管和风控保障，成立以来零违约。我可以给您看看过往业绩和风控报告。', sortOrder: 1 },
    { categoryId: cat3.id, title: '需要考虑', content: '好的，投资确实需要慎重。我先把产品资料发您，您有任何问题随时问我。另外这个月底有专属优惠活动，到时候我提醒您。', sortOrder: 2 },
    { categoryId: cat4.id, title: '限时优惠', content: '这个月底前投资，可以享受额外0.3%的收益加成，名额有限，已经有很多客户预约了，建议您尽早锁定。', sortOrder: 1 },
    { categoryId: cat4.id, title: '老客户推荐', content: '我手上很多客户都是复投的，像张总去年投了50万，今年又追加了80万。好产品经得起检验，您也试试？', sortOrder: 2 },
  ];

  for (const s of scripts) {
    await prisma.scriptContent.create({ data: s });
  }
  console.log('  ✅ 话术（4个类别，8条话术内容）');

  // ==================== 汇总 ====================
  const partnerCount = await prisma.partner.count({ where: { status: 1 } });
  const customerCount = await prisma.customer.count();
  const txCount = await prisma.transaction.count();
  const commCount = await prisma.commission.count();

  console.log('\n=========================================');
  console.log('📊 演示数据创建完成：');
  console.log(`  · 合伙人: ${partnerCount} 位`);
  console.log(`  · 客户: ${customerCount} 位`);
  console.log(`  · 流水: ${txCount} 笔`);
  console.log(`  · 佣金: ${commCount} 条`);
  console.log(`  · 话术: 4类 8条`);
  console.log(`  · 报备: 3条（2待审核）`);
  console.log(`  · 结算: 1条`);
  console.log(`  · 域名: 2个`);
  console.log('=========================================');
  console.log('\n🎯 合伙人层级结构：');
  console.log('  陈志远（顶级）');
  console.log('  ├── 王丽华');
  console.log('  │   └── 赵雪梅');
  console.log('  └── 刘建国');
  console.log('  孙伟明（独立，归属员工staff01）');
  console.log('\n✅ 可以开始演示了！');
}

main()
  .catch(e => { console.error('❌ 错误:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
