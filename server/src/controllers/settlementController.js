const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { success, fail } = require('../utils/response');
const logger = require('../utils/logger');

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;

const calcStoreProfitRate = (partner) => {
  return partner?.parentId ? 0.03 : 0.04;
};

// 月度结算汇总：只统计未归档流水，并按店铺盈利口径输出。
const getMonthlyStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      isArchived: 0,
    };

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = require('dayjs')(startDate).startOf('day').toDate();
      if (endDate) where.orderDate.lte = require('dayjs')(endDate).endOf('day').toDate();
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        id: true,
        amount: true,
        commissions: {
          select: {
            amount: true,
          },
        },
        customer: {
          select: {
            partner: {
              select: {
                id: true,
                name: true,
                phone: true,
                parentId: true,
              },
            },
          },
        },
      },
    });

    const partnerMap = new Map();
    let totalFlow = 0;
    let totalStoreProfit = 0;
    let totalCommission = 0;

    transactions.forEach((transaction) => {
      const partner = transaction.customer?.partner;
      if (!partner) return;

      const amount = Number(transaction.amount || 0);
      const storeProfit = amount * calcStoreProfitRate(partner);
      const commission = transaction.commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0);

      totalFlow += amount;
      totalStoreProfit += storeProfit;
      totalCommission += commission;

      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, {
          partnerId: partner.id,
          partnerName: partner.name,
          partnerPhone: partner.phone || '-',
          txCount: 0,
          totalFlow: 0,
          totalStoreProfit: 0,
          totalCommission: 0,
        });
      }

      const stats = partnerMap.get(partner.id);
      stats.txCount += 1;
      stats.totalFlow += amount;
      stats.totalStoreProfit += storeProfit;
      stats.totalCommission += commission;
    });

    const list = [...partnerMap.values()]
      .map((item) => ({
        ...item,
        totalFlow: roundMoney(item.totalFlow),
        totalStoreProfit: roundMoney(item.totalStoreProfit),
        totalCommission: roundMoney(item.totalCommission),
      }))
      .sort((a, b) => b.totalFlow - a.totalFlow);

    return success(res, {
      summary: {
        totalFlow: roundMoney(totalFlow),
        totalStoreProfit: roundMoney(totalStoreProfit),
        totalCommission: roundMoney(totalCommission),
      },
      list,
    });
  } catch (err) {
    logger.error('获取月度结算汇总失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getMonthlyStats,
};
