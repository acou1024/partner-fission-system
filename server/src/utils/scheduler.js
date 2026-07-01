/**
 * 定时任务调度器 - 素材自动清理等
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// 每天凌晨3点执行素材清理
const startScheduler = () => {
  // 计算距离下一个凌晨3点的毫秒数
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const delay = next.getTime() - now.getTime();

    setTimeout(async () => {
      await cleanOldMaterials();
      scheduleNext(); // 安排下一次
    }, delay);

    logger.info(`📅 素材自动清理任务已安排，下次执行: ${next.toLocaleString()}`);
  };

  scheduleNext();
};

// 清理过期素材
const cleanOldMaterials = async () => {
  try {
    // 从系统配置读取清理天数
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'material_clean_days' },
    });
    const days = parseInt(config?.configValue || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 查找过期素材
    const oldMaterials = await prisma.material.findMany({
      where: { uploadDate: { lt: cutoffDate } },
    });

    if (oldMaterials.length === 0) {
      logger.info('📅 素材清理：无过期素材');
      return;
    }

    // 删除物理文件
    for (const material of oldMaterials) {
      const filePath = path.join(process.cwd(), material.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 删除数据库记录
    const result = await prisma.material.deleteMany({
      where: { uploadDate: { lt: cutoffDate } },
    });

    logger.info(`📅 素材清理完成：已清理 ${result.count} 张过期素材（超过 ${days} 天）`);
  } catch (err) {
    logger.error('📅 素材自动清理失败:', err);
  }
};

module.exports = { startScheduler };
