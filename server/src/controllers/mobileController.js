/**
 * 合伙人移动端 H5 控制器
 */
const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const getNaturalDateRanges = () => ({
  todayStart: dayjs().startOf('day').toDate(),
  todayEnd: dayjs().endOf('day').toDate(),
  monthStart: dayjs().startOf('month').toDate(),
  monthEnd: dayjs().endOf('month').toDate(),
  lastMonthStart: dayjs().subtract(1, 'month').startOf('month').toDate(),
  lastMonthEnd: dayjs().subtract(1, 'month').endOf('month').toDate(),
});

const maskName = (name) => {
  if (!name) return '***';
  if (name.length <= 1) return '*';
  if (name.length === 2) return `${name[0]}*`;
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
};

// 获取合伙人工作台首页数据
const getWorkbench = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const {
      todayStart,
      todayEnd,
      monthStart,
      monthEnd,
      lastMonthStart,
      lastMonthEnd,
    } = getNaturalDateRanges();

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        balance: true,
        totalEarnings: true,
        directRate: true,
        teamRate: true,
        inviteCode: true,
        _count: { select: { customers: true, children: true } },
      },
    });

    if (!partner) {
      return fail(res, '合伙人信息不存在');
    }

    const [
      monthDirectTurnover,
      monthTeamTurnover,
      monthCommission,
      todayTurnover,
      todayCommission,
      archivedCommission,
      lastMonthTurnover,
      todayNewCustomers,
      totalCustomers,
      totalDirectTurnover,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          customer: { partnerId },
          orderDate: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          customer: { partner: { parentId: partnerId } },
          orderDate: { gte: monthStart, lte: monthEnd },
        },
      }),
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: {
          partnerId,
          transaction: {
            orderDate: { gte: monthStart, lte: monthEnd },
          },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          customer: { partnerId },
          orderDate: { gte: todayStart, lte: todayEnd },
          isArchived: 0,
        },
      }),
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: {
          partnerId,
          transaction: {
            orderDate: { gte: todayStart, lte: todayEnd },
            isArchived: 0,
          },
        },
      }),
      prisma.commission.aggregate({
        _sum: { amount: true },
        where: {
          partnerId,
          transaction: {
            orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
          },
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          customer: { partnerId },
          orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      // 今日新增客户数
      prisma.customer.count({
        where: {
          partnerId,
          status: 1,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      // 有效总客户数，与客户列表口径保持一致
      prisma.customer.count({
        where: {
          partnerId,
          status: 1,
        },
      }),
      // 累计直推流水（含已归档，全量）
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          customer: { partnerId },
        },
      }),
    ]);

    return success(res, {
      partner,
      stats: {
        monthDirectTurnover: monthDirectTurnover._sum.amount || 0,
        monthTeamTurnover: monthTeamTurnover._sum.amount || 0,
        monthCommission: monthCommission._sum.amount || 0,
        todayTurnover: todayTurnover._sum.amount || 0,
        todayCommission: todayCommission._sum.amount || 0,
        archivedTurnover: lastMonthTurnover._sum.amount || 0,
        archivedCommission: archivedCommission._sum.amount || 0,
        todayNewCustomers,
        totalCustomers,
        totalDirectTurnover: totalDirectTurnover._sum.amount || 0,
      },
    });
  } catch (err) {
    logger.error('获取工作台数据失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取我的客户明细（脱敏显示）
const getMyCustomers = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;
    const {
      todayStart,
      todayEnd,
      lastMonthStart,
      lastMonthEnd,
    } = getNaturalDateRanges();

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: { partnerId, status: 1 },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          nickname: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where: { partnerId, status: 1 } }),
    ]);

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const [todayAmount, lastMonthAmount, lastMonthLatestTransaction] = await Promise.all([
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              customerId: customer.id,
              orderDate: { gte: todayStart, lte: todayEnd },
              isArchived: 0,
            },
          }),
          // 客户列表展示上月流水，日期也取上月最近一笔流水日期，避免与加入日期混淆。
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              customerId: customer.id,
              orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
            },
          }),
          prisma.transaction.findFirst({
            where: {
              customerId: customer.id,
              orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
            },
            select: { orderDate: true },
            orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
          }),
        ]);

        return {
          ...customer,
          nickname: maskName(customer.nickname),
          todayTurnover: todayAmount._sum.amount || 0,
          lastMonthTurnover: lastMonthAmount._sum.amount || 0,
          lastMonthTransactionDate: lastMonthLatestTransaction?.orderDate || null,
        };
      })
    );

    return paginate(res, customersWithStats, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取客户明细失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取我的团队（下级合伙人列表）
const getMyTeam = async (req, res) => {
  try {
    const partnerId = req.partner.id;

    const children = await prisma.partner.findMany({
      where: { parentId: partnerId, status: 1 },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: { select: { customers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const teamWithStats = await Promise.all(
      children.map(async (child) => {
        const monthTurnover = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            customer: { partnerId: child.id },
            isArchived: 0,
          },
        });

        return {
          ...child,
          name: maskName(child.name),
          monthTurnover: monthTurnover._sum.amount || 0,
        };
      })
    );

    return success(res, teamWithStats);
  } catch (err) {
    logger.error('获取团队数据失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 报备客户
const reportCustomer = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { nickname, remark } = req.body;

    if (!nickname) {
      return fail(res, '请填写客户昵称或群名');
    }

    const report = await prisma.customerReport.create({
      data: {
        nickname,
        remark: remark || null,
        partnerId,
      },
    });

    return success(res, report, '报备成功，请等待员工审核确认');
  } catch (err) {
    logger.error('报备客户失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取我的报备记录
const getMyReports = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const [list, total] = await Promise.all([
      prisma.customerReport.findMany({
        where: { partnerId },
        skip,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customerReport.count({ where: { partnerId } }),
    ]);

    return paginate(res, list, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取报备记录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取佣金明细
const getMyCommissions = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { page = 1, pageSize = 20, type, period } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const where = { partnerId };
    if (type) {
      where.type = type;
    }
    if (period === 'lastMonth') {
      const { lastMonthStart, lastMonthEnd } = getNaturalDateRanges();
      where.transaction = {
        orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
      };
    }

    const [list, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          transaction: {
            select: {
              id: true,
              amount: true,
              orderDate: true,
              customer: {
                select: {
                  nickname: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commission.count({ where }),
    ]);

    const maskedList = list.map((item) => ({
      ...item,
      transaction: item.transaction
        ? {
            ...item.transaction,
            customer: item.transaction.customer
              ? { nickname: maskName(item.transaction.customer.nickname) }
              : null,
          }
        : null,
    }));

    return paginate(res, maskedList, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取佣金明细失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取结算记录
const getMySettlements = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const [list, total] = await Promise.all([
      prisma.settlement.findMany({
        where: { partnerId },
        skip,
        take: pageSizeNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.count({ where: { partnerId } }),
    ]);

    return paginate(res, list, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取结算记录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取素材列表
const getMaterials = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;

    const [list, total] = await Promise.all([
      prisma.material.findMany({
        skip,
        take: pageSizeNum,
        orderBy: { uploadDate: 'desc' },
      }),
      prisma.material.count(),
    ]);

    return paginate(res, list, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取素材失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取话术列表
const getScripts = async (req, res) => {
  try {
    const categories = await prisma.scriptCategory.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
            scripts: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        scripts: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return success(res, categories);
  } catch (err) {
    logger.error('获取话术失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取收益推演默认配置
const getProjectionConfig = async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: ['projection_base_amount', 'projection_default_odds'],
        },
      },
    });

    const result = {};
    configs.forEach((item) => {
      result[item.configKey] = item.configValue;
    });

    return success(res, {
      baseAmount: result.projection_base_amount || '10',
      odds: result.projection_default_odds || '',
    });
  } catch (err) {
    logger.error('获取推演配置失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取合伙人的上月流水（只返回当前合伙人可拿佣金的上个自然月流水）
const getMyArchivedTransactions = async (req, res) => {
  try {
    const partnerId = req.partner.id;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    const skip = (pageNum - 1) * pageSizeNum;
    const { lastMonthStart, lastMonthEnd } = getNaturalDateRanges();

    const where = {
      orderDate: { gte: lastMonthStart, lte: lastMonthEnd },
      commissions: {
        some: { partnerId },
      },
    };

    const [list, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          customer: {
            select: {
              id: true,
              nickname: true,
            },
          },
          commissions: {
            where: { partnerId },
            select: {
              id: true,
              amount: true,
              type: true,
              settled: true,
            },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.transaction.count({ where }),
    ]);

    const maskedList = list.map((item) => ({
      ...item,
      customer: item.customer
        ? {
            ...item.customer,
            nickname: maskName(item.customer.nickname),
          }
        : null,
    }));

    return paginate(res, maskedList, total, pageNum, pageSizeNum);
  } catch (err) {
    logger.error('获取往期流水失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getWorkbench,
  getMyCustomers,
  getMyTeam,
  reportCustomer,
  getMyReports,
  getMyCommissions,
  getMySettlements,
  getMaterials,
  getScripts,
  getProjectionConfig,
  getMyArchivedTransactions,
};
