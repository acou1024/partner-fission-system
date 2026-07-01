/**
 * 数据库初始化种子数据
 * 运行方式: node prisma/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始初始化种子数据...');

  // 1. 创建超级管理员
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.sysUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      realName: '超级管理员',
      phone: '13800000000',
      role: 'admin',
      status: 1,
    },
  });
  console.log('✅ 超级管理员已创建:', admin.username);

  // 2. 创建示例员工
  const staffPassword = await bcrypt.hash('staff123', 10);
  const staff = await prisma.sysUser.upsert({
    where: { username: 'staff01' },
    update: {},
    create: {
      username: 'staff01',
      password: staffPassword,
      realName: '员工小王',
      phone: '13800000001',
      role: 'staff',
      status: 1,
    },
  });
  console.log('✅ 示例员工已创建:', staff.username);

  // 3. 初始化系统配置
  const defaultConfigs = [
    { configKey: 'default_direct_rate', configValue: '3.00', description: '默认直推分润比例(%)' },
    { configKey: 'default_team_rate', configValue: '1.00', description: '默认团队分润比例(%)' },
    { configKey: 'material_clean_days', configValue: '30', description: '素材自动清理天数' },
    { configKey: 'projection_base_amount', configValue: '100', description: '收益推演工具-起始金额' },
    { configKey: 'projection_default_coefficient', configValue: '1.98', description: '收益推演工具-默认收益系数' },
  ];

  for (const cfg of defaultConfigs) {
    await prisma.systemConfig.upsert({
      where: { configKey: cfg.configKey },
      update: {},
      create: cfg,
    });
  }
  console.log('✅ 系统配置已初始化');

  console.log('🎉 种子数据初始化完成！');
  console.log('📌 管理员账号: admin / admin123');
  console.log('📌 员工账号: staff01 / staff123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
