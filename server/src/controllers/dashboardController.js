/**
 * 数据大盘控制器（Dashboard统计）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const { success, fail, paginate } = require('../utils/response');
const logger = require('../utils/logger');

// 获取大盘统计数据
const getOverview = async (req, res) => {
  try {
    const todayStart = dayjs().startOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();
    const now = new Date();

    // 构建员工筛选条件
    const staffFilter = req.user.role === 'staff' ? { partner: { staffId: req.user.id } } : {};
    const partnerStaffFilter = req.user.role === 'staff' ? { staffId: req.user.id } : {};

    // 并行查询所有统计数据
    const [
      todayTurnover,
      monthTurnover,
      todayCommission,
      monthCommission,
      todayNewPartners,
      monthNewPartners,
      todayNewCustomers,
      monthNewCustomers,
      totalPartners,
      totalCustomers,
      totalBalance,
    ] = await Promise.all([
      // 今日总流水
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { orderDate: { gte: todayStart, lte: now }, customer: staffFilter },
      }),
      // 本月总流水
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { orderDate: { gte: monthStart, lte: now }, customer: staffFilter },
      }),
      // 今日总佣金支出
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart }, ...staffFilter },
      }),
      // 本月总佣金支出
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: monthStart }, ...staffFilter },
      }),
      // 今日新增合伙人
      prisma.partner.count({
        where: { createdAt: { gte: todayStart }, ...partnerStaffFilter },
      }),
      // 本月新增合伙人
      prisma.partner.count({
        where: { createdAt: { gte: monthStart }, ...partnerStaffFilter },
      }),
      // 今日新增客户
      prisma.customer.count({
        where: { createdAt: { gte: todayStart }, partner: partnerStaffFilter },
      }),
      // 本月新增客户
      prisma.customer.count({
        where: { createdAt: { gte: monthStart }, partner: partnerStaffFilter },
      }),
      // 总合伙人数
      prisma.partner.count({ where: { status: 1, ...partnerStaffFilter } }),
      // 总客户数
      prisma.customer.count({ where: { status: 1, partner: partnerStaffFilter } }),
      // 合伙人总待结算余额
      prisma.partner.aggregate({
        _sum: { balance: true },
        where: { status: 1, ...partnerStaffFilter },
      }),
    ]);

    return success(res, {
      today: {
        turnover: todayTurnover._sum.amount || 0,
        commission: todayCommission._sum.amount || 0,
        newPartners: todayNewPartners,
        newCustomers: todayNewCustomers,
      },
      month: {
        turnover: monthTurnover._sum.amount || 0,
        commission: monthCommission._sum.amount || 0,
        newPartners: monthNewPartners,
        newCustomers: monthNewCustomers,
      },
      total: {
        partners: totalPartners,
        customers: totalCustomers,
        pendingBalance: totalBalance._sum.balance || 0,
      },
    });
  } catch (err) {
    logger.error('获取大盘数据失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 流水排行榜（按合伙人本月贡献排序）
const getRanking = async (req, res) => {
  try {
    const { period = 'month', page = 1, pageSize = 20 } = req.query;
    const monthStart = dayjs().startOf('month').toDate();
    const todayStart = dayjs().startOf('day').toDate();
    const startDate = period === 'today' ? todayStart : monthStart;

    // 使用 Prisma ORM 查询排行榜（避免 raw query 的 BigInt 兼容问题）
    const partners = await prisma.partner.findMany({
      where: { status: 1 },
      select: {
        id: true,
        name: true,
        phone: true,
        customers: {
          where: { status: 1 },
          select: {
            id: true,
            transactions: {
              where: { orderDate: { gte: startDate } },
              select: { amount: true },
            },
          },
        },
        commissions: {
          where: { createdAt: { gte: startDate } },
          select: { amount: true },
        },
      },
    });

    // 计算每个合伙人的流水总额和佣金总额
    const rankings = partners.map(p => {
      let totalTurnover = 0;
      let orderCount = 0;
      let totalCommission = 0;
      const customerCount = p.customers.length;
      p.customers.forEach(c => {
        c.transactions.forEach(t => {
          totalTurnover += Number(t.amount);
          orderCount++;
        });
      });
      p.commissions.forEach(c => {
        totalCommission += Number(c.amount);
      });
      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        total_turnover: totalTurnover,
        order_count: orderCount,
        customer_count: customerCount,
        total_commission: totalCommission,
      };
    });

    // 按流水降序排序并分页
    rankings.sort((a, b) => b.total_turnover - a.total_turnover);

    const total = rankings.length;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const pagedRankings = rankings.slice(skip, skip + parseInt(pageSize));

    return paginate(res, pagedRankings, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取排行榜失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = { getOverview, getRanking };
