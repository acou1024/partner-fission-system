const dayjs = require('dayjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { success, fail } = require('../utils/response');
const logger = require('../utils/logger');
const {
  normalizeSchemeDate,
  formatSchemeDate,
  getSchemeOddsFromMap,
  loadSchemeOddsMap,
} = require('../utils/schemeOdds');

const parseSchemeDate = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return null;
  return normalizeSchemeDate(parsed.toDate());
};

const buildMissingOddsMessage = (missingOdds) => {
  const unique = [...new Set(missingOdds)];
  const preview = unique.slice(0, 6).join('、');
  const suffix = unique.length > 6 ? ' 等' : '';
  return `以下日期的方案赔率未配置：${preview}${suffix}`;
};

// 获取指定日期的方案赔率列表。
const getSchemes = async (req, res) => {
  try {
    const effectiveDate = parseSchemeDate(req.query.date) || normalizeSchemeDate(new Date());

    const [list, names] = await Promise.all([
      prisma.bettingScheme.findMany({
        where: { effectiveDate },
        orderBy: [{ name: 'asc' }],
      }),
      prisma.bettingScheme.findMany({
        distinct: ['name'],
        select: { name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return success(res, {
      date: formatSchemeDate(effectiveDate),
      list,
      schemeNames: names.map((item) => item.name),
    });
  } catch (err) {
    logger.error('获取方案赔率失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 新增某天的方案赔率。
const createScheme = async (req, res) => {
  try {
    const { name, odds, effectiveDate } = req.body;
    const parsedDate = parseSchemeDate(effectiveDate);

    if (!name || odds === undefined || !parsedDate) {
      return fail(res, '方案名称、赔率和生效日期不能为空');
    }

    const existing = await prisma.bettingScheme.findFirst({
      where: {
        name: String(name).trim(),
        effectiveDate: parsedDate,
      },
    });
    if (existing) {
      return fail(res, '该日期下的方案赔率已存在');
    }

    const scheme = await prisma.bettingScheme.create({
      data: {
        name: String(name).trim(),
        odds: parseFloat(odds),
        effectiveDate: parsedDate,
      },
    });

    return success(res, scheme, '方案赔率创建成功');
  } catch (err) {
    logger.error('创建方案赔率失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新方案赔率记录。
const updateScheme = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, odds, status, effectiveDate } = req.body;

    const existing = await prisma.bettingScheme.findUnique({
      where: { id: parseInt(id, 10) },
    });
    if (!existing) {
      return fail(res, '方案赔率记录不存在');
    }

    const nextName = name !== undefined ? String(name).trim() : existing.name;
    const nextDate = effectiveDate !== undefined ? parseSchemeDate(effectiveDate) : existing.effectiveDate;
    if (!nextName || !nextDate) {
      return fail(res, '方案名称和生效日期不能为空');
    }

    const conflict = await prisma.bettingScheme.findFirst({
      where: {
        id: { not: parseInt(id, 10) },
        name: nextName,
        effectiveDate: nextDate,
      },
    });
    if (conflict) {
      return fail(res, '该日期下已存在同名方案赔率');
    }

    const scheme = await prisma.bettingScheme.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: nextName,
        effectiveDate: nextDate,
        ...(odds !== undefined ? { odds: parseFloat(odds) } : {}),
        ...(status !== undefined ? { status: parseInt(status, 10) } : {}),
      },
    });

    return success(res, scheme, '方案赔率更新成功');
  } catch (err) {
    logger.error('更新方案赔率失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除某条方案赔率记录。
const deleteScheme = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bettingScheme.delete({ where: { id: parseInt(id, 10) } });
    return success(res, null, '方案赔率删除成功');
  } catch (err) {
    logger.error('删除方案赔率失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 复制前一天或指定日期的赔率到目标日期。
const copySchemes = async (req, res) => {
  try {
    const targetDate = parseSchemeDate(req.body.targetDate);
    const sourceDate = parseSchemeDate(req.body.sourceDate);

    if (!targetDate) {
      return fail(res, '请选择目标日期');
    }

    let sourceDateValue = sourceDate;
    if (!sourceDateValue) {
      const latestRecord = await prisma.bettingScheme.findFirst({
        where: {
          effectiveDate: {
            lt: targetDate,
          },
        },
        orderBy: {
          effectiveDate: 'desc',
        },
      });

      if (!latestRecord) {
        return fail(res, '目标日期之前没有可复制的赔率记录');
      }

      sourceDateValue = latestRecord.effectiveDate;
    }

    const sourceList = await prisma.bettingScheme.findMany({
      where: {
        effectiveDate: sourceDateValue,
      },
      orderBy: { name: 'asc' },
    });

    if (sourceList.length === 0) {
      return fail(res, '源日期没有可复制的赔率记录');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of sourceList) {
        const existing = await tx.bettingScheme.findFirst({
          where: {
            name: item.name,
            effectiveDate: targetDate,
          },
        });

        if (existing) {
          await tx.bettingScheme.update({
            where: { id: existing.id },
            data: {
              odds: item.odds,
              status: item.status,
            },
          });
        } else {
          await tx.bettingScheme.create({
            data: {
              name: item.name,
              odds: item.odds,
              status: item.status,
              effectiveDate: targetDate,
            },
          });
        }
      }
    });

    return success(
      res,
      {
        targetDate: formatSchemeDate(targetDate),
        sourceDate: formatSchemeDate(sourceDateValue),
        count: sourceList.length,
      },
      '方案赔率复制成功'
    );
  } catch (err) {
    logger.error('复制方案赔率失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 客户盈利汇总：优先用实际回流，否则按当天方案赔率估算。
const getCustomerProfits = async (req, res) => {
  try {
    const { partnerId, startDate, endDate, page = 1, pageSize = 20 } = req.query;

    const customerWhere = { status: 1 };
    if (partnerId) customerWhere.partnerId = parseInt(partnerId, 10);

    const txWhere = {};
    if (startDate || endDate) {
      txWhere.orderDate = {};
      if (startDate) txWhere.orderDate.gte = dayjs(startDate).startOf('day').toDate();
      if (endDate) txWhere.orderDate.lte = dayjs(endDate).endOf('day').toDate();
    }

    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        nickname: true,
        partner: { select: { id: true, name: true } },
        transactions: {
          where: txWhere,
          select: {
            amount: true,
            plan: true,
            returnAmount: true,
            orderDate: true,
          },
        },
      },
    });

    const oddsDates = [];
    customers.forEach((customer) => {
      customer.transactions.forEach((transaction) => {
        if (transaction.returnAmount == null && transaction.plan) {
          oddsDates.push(transaction.orderDate);
        }
      });
    });

    const oddsMap = await loadSchemeOddsMap(prisma, oddsDates);
    const missingOdds = [];

    const results = customers
      .map((customer) => {
        let totalBet = 0;
        let totalReturn = 0;
        let betCount = 0;

        customer.transactions.forEach((transaction) => {
          const amount = Number(transaction.amount || 0);
          totalBet += amount;
          betCount += 1;

          if (transaction.returnAmount != null) {
            totalReturn += Number(transaction.returnAmount);
            return;
          }

          if (!transaction.plan) {
            return;
          }

          const odds = getSchemeOddsFromMap(oddsMap, transaction.orderDate, transaction.plan);
          if (odds === undefined) {
            missingOdds.push(`${formatSchemeDate(transaction.orderDate)} ${transaction.plan}`);
            return;
          }

          totalReturn += amount * odds;
        });

        return {
          customerId: customer.id,
          nickname: customer.nickname,
          partnerName: customer.partner?.name || '-',
          partnerId: customer.partner?.id || null,
          betCount,
          totalBet: Math.round(totalBet * 100) / 100,
          totalReturn: Math.round(totalReturn * 100) / 100,
          totalProfit: Math.round((totalReturn - totalBet) * 100) / 100,
        };
      })
      .filter((item) => item.betCount > 0);

    if (missingOdds.length > 0) {
      return fail(res, buildMissingOddsMessage(missingOdds));
    }

    results.sort((a, b) => b.totalProfit - a.totalProfit);

    const summary = results.reduce(
      (acc, item) => {
        acc.totalBet += item.totalBet;
        acc.totalReturn += item.totalReturn;
        acc.totalProfit += item.totalProfit;
        return acc;
      },
      { totalBet: 0, totalReturn: 0, totalProfit: 0 }
    );

    summary.totalBet = Math.round(summary.totalBet * 100) / 100;
    summary.totalReturn = Math.round(summary.totalReturn * 100) / 100;
    summary.totalProfit = Math.round(summary.totalProfit * 100) / 100;

    const currentPage = parseInt(page, 10);
    const currentPageSize = parseInt(pageSize, 10);
    const total = results.length;
    const skip = (currentPage - 1) * currentPageSize;
    const list = results.slice(skip, skip + currentPageSize);

    return success(res, {
      list,
      summary,
      pagination: {
        total,
        page: currentPage,
        pageSize: currentPageSize,
        totalPages: Math.ceil(total / currentPageSize),
      },
    });
  } catch (err) {
    logger.error('获取客户盈利汇总失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getSchemes,
  createScheme,
  updateScheme,
  deleteScheme,
  copySchemes,
  getCustomerProfits,
};
