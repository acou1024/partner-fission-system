/**
 * 流水账单与佣金控制器。
 */
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const XLSX = require('xlsx');
const fs = require('fs');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

const normalizeText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const normalizeDecimal = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return new Prisma.Decimal(value);
};

const getCustomerWithPartner = async (customerId) => {
  return prisma.customer.findUnique({
    where: { id: parseInt(customerId, 10) },
    include: {
      partner: {
        include: {
          parent: true,
        },
      },
    },
  });
};

// 根据合伙人的分润模式，解析实际适用的分润比例。
const resolveRate = async (partner, type, db = prisma) => {
  if (partner.rateMode !== 'tiered' || !partner.tieredRates) {
    return type === 'direct' ? partner.directRate : partner.teamRate;
  }

  try {
    const tiers = JSON.parse(partner.tieredRates);
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return type === 'direct' ? partner.directRate : partner.teamRate;
    }

    const monthTurnover = await db.transaction.aggregate({
      _sum: { amount: true },
      where: {
        customer: { partnerId: partner.id },
        isArchived: 0,
      },
    });
    const total = Number(monthTurnover._sum.amount || 0);

    const sorted = [...tiers].sort((a, b) => (b.min || 0) - (a.min || 0));
    for (const tier of sorted) {
      if (total >= (tier.min || 0)) {
        return new Prisma.Decimal(tier.rate);
      }
    }

    return type === 'direct' ? partner.directRate : partner.teamRate;
  } catch (err) {
    logger.warn('解析阶梯比例失败，回退固定比例:', err.message);
    return type === 'direct' ? partner.directRate : partner.teamRate;
  }
};

// 创建佣金并同步余额与累计收益。
const createCommissionsForTransaction = async (db, transactionId, transactionAmount, partner) => {
  const directRate = await resolveRate(partner, 'direct', db);
  const directCommission = transactionAmount.mul(directRate).div(100);

  await db.commission.create({
    data: {
      amount: directCommission,
      rate: directRate,
      type: 'direct',
      partnerId: partner.id,
      transactionId,
    },
  });

  await db.partner.update({
    where: { id: partner.id },
    data: {
      balance: { increment: directCommission },
      totalEarnings: { increment: directCommission },
    },
  });

  if (partner.parent) {
    const teamRate = partner.parent.teamRate;
    const teamCommission = transactionAmount.mul(teamRate).div(100);

    await db.commission.create({
      data: {
        amount: teamCommission,
        rate: teamRate,
        type: 'team',
        partnerId: partner.parent.id,
        transactionId,
      },
    });

    await db.partner.update({
      where: { id: partner.parent.id },
      data: {
        balance: { increment: teamCommission },
        totalEarnings: { increment: teamCommission },
      },
    });
  }
};

// 回滚佣金，供删除或重算时使用。
const rollbackCommissions = async (db, commissions = []) => {
  for (const commission of commissions) {
    await db.partner.update({
      where: { id: commission.partnerId },
      data: {
        balance: { decrement: commission.amount },
        totalEarnings: { decrement: commission.amount },
      },
    });
  }
};

const getTransactionDetail = async (id) => {
  return prisma.transaction.findUnique({
    where: { id: parseInt(id, 10) },
    include: {
      customer: {
        select: {
          id: true,
          nickname: true,
          partner: { select: { id: true, name: true } },
        },
      },
      operator: { select: { id: true, realName: true } },
      commissions: { select: { id: true, amount: true, rate: true, type: true, partnerId: true, settled: true } },
    },
  });
};

// 录入流水，支持指定历史日期、方案和回流金额。
const createTransaction = async (req, res) => {
  try {
    const { customerId, amount, orderDate, remark, plan, returnAmount } = req.body;
    if (!customerId || !amount || !orderDate) {
      return fail(res, '客户、流水金额和打单日期不能为空');
    }
    if (parseFloat(amount) <= 0) {
      return fail(res, '流水金额必须大于 0');
    }

    const customer = await getCustomerWithPartner(customerId);
    if (!customer) {
      return fail(res, '客户不存在');
    }
    if (customer.status !== 1) {
      return fail(res, '该客户已失效');
    }

    const transactionAmount = new Prisma.Decimal(amount);

    const created = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount: transactionAmount,
          orderDate: new Date(orderDate),
          remark: normalizeText(remark),
          plan: normalizeText(plan),
          returnAmount: normalizeDecimal(returnAmount),
          customerId: parseInt(customerId, 10),
          operatorId: req.user.id,
        },
      });

      await createCommissionsForTransaction(tx, transaction.id, transactionAmount, customer.partner);
      return transaction;
    });

    const fullResult = await getTransactionDetail(created.id);
    return success(res, fullResult, '流水录入成功，佣金已自动计算');
  } catch (err) {
    logger.error('录入流水失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 编辑流水，用于补录历史日期、方案、回流金额和客户归属。
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, amount, orderDate, remark, plan, returnAmount } = req.body;

    const existing = await prisma.transaction.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        commissions: true,
        customer: {
          include: {
            partner: {
              include: {
                parent: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return fail(res, '流水记录不存在');
    }

    const nextCustomerId = customerId !== undefined ? parseInt(customerId, 10) : existing.customerId;
    const nextAmount = amount !== undefined ? parseFloat(amount) : Number(existing.amount);

    if (!nextCustomerId || !nextAmount || nextAmount <= 0) {
      return fail(res, '客户和流水金额必须有效');
    }

    const affectsCommission =
      (customerId !== undefined && nextCustomerId !== existing.customerId) ||
      (amount !== undefined && nextAmount !== Number(existing.amount));
    const hasSettledCommissions = existing.commissions.some((item) => item.settled === 1);

    if (affectsCommission && hasSettledCommissions) {
      return fail(res, '该流水已有已结算佣金，不能修改客户或金额');
    }

    let nextCustomer = existing.customer;
    if (nextCustomerId !== existing.customerId) {
      nextCustomer = await getCustomerWithPartner(nextCustomerId);
      if (!nextCustomer) {
        return fail(res, '目标客户不存在');
      }
      if (nextCustomer.status !== 1) {
        return fail(res, '目标客户已失效');
      }
    }

    await prisma.$transaction(async (tx) => {
      if (affectsCommission) {
        await rollbackCommissions(tx, existing.commissions);
        await tx.commission.deleteMany({
          where: { transactionId: parseInt(id, 10) },
        });
      }

      await tx.transaction.update({
        where: { id: parseInt(id, 10) },
        data: {
          customerId: nextCustomerId,
          amount: new Prisma.Decimal(nextAmount),
          ...(orderDate !== undefined ? { orderDate: new Date(orderDate) } : {}),
          ...(remark !== undefined ? { remark: normalizeText(remark) } : {}),
          ...(plan !== undefined ? { plan: normalizeText(plan) } : {}),
          ...(returnAmount !== undefined ? { returnAmount: normalizeDecimal(returnAmount) } : {}),
        },
      });

      if (affectsCommission) {
        await createCommissionsForTransaction(
          tx,
          parseInt(id, 10),
          new Prisma.Decimal(nextAmount),
          nextCustomer.partner
        );
      }
    });

    const fullResult = await getTransactionDetail(id);
    return success(res, fullResult, '流水更新成功');
  } catch (err) {
    logger.error('更新流水失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取流水列表（分页）。
const getTransactions = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, customerId, partnerId, startDate, endDate, isArchived } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    const where = {};
    if (isArchived !== undefined && isArchived !== '') {
      where.isArchived = parseInt(isArchived, 10);
    }
    if (customerId) {
      where.customerId = parseInt(customerId, 10);
    }
    if (partnerId) {
      where.customer = { partnerId: parseInt(partnerId, 10) };
    }
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = dayjs(startDate).startOf('day').toDate();
      if (endDate) where.orderDate.lte = dayjs(endDate).endOf('day').toDate();
    }
    if (req.user.role === 'staff') {
      if (!where.customer) where.customer = {};
      where.customer.partner = { staffId: req.user.id };
    }

    const [list, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(pageSize, 10),
        include: {
          customer: {
            select: {
              id: true,
              nickname: true,
              partner: { select: { id: true, name: true } },
            },
          },
          operator: { select: { id: true, realName: true } },
          commissions: { select: { id: true, amount: true, rate: true, type: true, partnerId: true, settled: true } },
        },
        orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page, 10), parseInt(pageSize, 10));
  } catch (err) {
    logger.error('获取流水列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除流水，同时回退相关佣金。
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id, 10) },
      include: { commissions: true },
    });
    if (!transaction) {
      return fail(res, '流水记录不存在');
    }

    const hasSettled = transaction.commissions.some((item) => item.settled === 1);
    if (hasSettled) {
      return fail(res, '该流水关联的佣金已结算，无法删除');
    }

    await prisma.$transaction(async (tx) => {
      await rollbackCommissions(tx, transaction.commissions);
      await tx.commission.deleteMany({
        where: { transactionId: parseInt(id, 10) },
      });
      await tx.transaction.delete({
        where: { id: parseInt(id, 10) },
      });
    });

    return success(res, null, '流水已删除，佣金已回退');
  } catch (err) {
    logger.error('删除流水失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 结算出款。
const settlePartner = async (req, res) => {
  try {
    const { partnerId, amount, remark } = req.body;
    if (!partnerId || !amount) {
      return fail(res, '合伙人和结算金额不能为空');
    }

    const partner = await prisma.partner.findUnique({ where: { id: parseInt(partnerId, 10) } });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }
    if (parseFloat(amount) > parseFloat(partner.balance)) {
      return fail(res, `结算金额不能超过当前余额 ${partner.balance} 元`);
    }

    const settlement = await prisma.$transaction(async (tx) => {
      const record = await tx.settlement.create({
        data: {
          amount: new Prisma.Decimal(amount),
          remark: normalizeText(remark),
          partnerId: parseInt(partnerId, 10),
        },
      });

      await tx.partner.update({
        where: { id: parseInt(partnerId, 10) },
        data: {
          balance: { decrement: new Prisma.Decimal(amount) },
        },
      });

      await tx.commission.updateMany({
        where: {
          partnerId: parseInt(partnerId, 10),
          settled: 0,
        },
        data: { settled: 1 },
      });

      return record;
    });

    return success(res, settlement, '结算成功');
  } catch (err) {
    logger.error('结算失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取结算记录。
const getSettlements = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, partnerId } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    const where = {};
    if (partnerId) {
      where.partnerId = parseInt(partnerId, 10);
    }

    const [list, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        skip,
        take: parseInt(pageSize, 10),
        include: {
          partner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page, 10), parseInt(pageSize, 10));
  } catch (err) {
    logger.error('获取结算记录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 解析 Excel，提取客户、方案、金额和回流。
const parseExcelSheet = (worksheet) => {
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (raw.length < 2) return [];

  const header = raw[0];
  const rows = [];
  const isSimple = String(header[1] || '').includes('客户');

  if (isSimple) {
    for (let i = 1; i < raw.length; i += 1) {
      const row = raw[i];
      const nickname = String(row[1] || '').trim();
      const plan = String(row[2] || '').trim();
      const amount = parseFloat(row[3]);
      const returnAmount = parseFloat(row[4]);
      if (nickname && amount > 0) {
        rows.push({
          nickname,
          plan,
          amount,
          returnAmount: Number.isNaN(returnAmount) ? null : returnAmount,
        });
      }
    }
    return rows;
  }

  const groups = [];
  for (let column = 0; column < header.length; column += 1) {
    if (String(header[column]).includes('客户')) {
      groups.push({
        nameCol: column,
        planCol: column + 1,
        amountCol: column + 2,
        returnCol: column + 3,
      });
    }
  }

  for (let rowIndex = 1; rowIndex < raw.length; rowIndex += 1) {
    const row = raw[rowIndex];
    for (const group of groups) {
      const nickname = String(row[group.nameCol] || '').trim();
      const plan = String(row[group.planCol] || '').trim();
      const amount = parseFloat(row[group.amountCol]);
      const returnAmount = parseFloat(row[group.returnCol]);
      if (nickname && amount > 0) {
        rows.push({
          nickname,
          plan,
          amount,
          returnAmount: Number.isNaN(returnAmount) ? null : returnAmount,
        });
      }
    }
  }

  return rows;
};

// 批量导入流水。
const bulkImportTransactions = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, '请上传 Excel 文件');
    }

    const { orderDate, sheetName } = req.body;
    if (!orderDate) {
      return fail(res, '请指定打单日期');
    }

    const workbook = XLSX.readFile(req.file.path);
    let targetSheet = sheetName;
    if (!targetSheet || !workbook.SheetNames.includes(targetSheet)) {
      targetSheet = workbook.SheetNames[0];
    }

    const worksheet = workbook.Sheets[targetSheet];
    const parsedRows = parseExcelSheet(worksheet);
    if (parsedRows.length === 0) {
      fs.unlinkSync(req.file.path);
      return fail(res, `工作表「${targetSheet}」未解析到有效数据`);
    }

    const customers = await prisma.customer.findMany({
      where: { status: 1 },
      include: {
        partner: {
          include: {
            parent: true,
          },
        },
      },
    });

    const nicknameMap = new Map();
    const duplicateNicknames = [];
    customers.forEach((customer) => {
      const key = customer.nickname.trim();
      if (nicknameMap.has(key)) {
        duplicateNicknames.push(key);
      }
      nicknameMap.set(key, customer);
    });
    if (duplicateNicknames.length > 0) {
      logger.warn('Excel 导入检测到重名客户，可能影响匹配:', [...new Set(duplicateNicknames)].join(', '));
    }

    const result = {
      created: 0,
      skipped: [],
      total: parsedRows.length,
      sheet: targetSheet,
      sheets: workbook.SheetNames,
    };
    const txDate = new Date(orderDate);

    for (const row of parsedRows) {
      const customer = nicknameMap.get(row.nickname);
      if (!customer) {
        result.skipped.push({ nickname: row.nickname, amount: row.amount, reason: '客户不存在' });
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const transaction = await tx.transaction.create({
            data: {
              amount: new Prisma.Decimal(row.amount),
              orderDate: txDate,
              remark: null,
              plan: normalizeText(row.plan),
              returnAmount: normalizeDecimal(row.returnAmount),
              customerId: customer.id,
              operatorId: req.user.id,
            },
          });

          await createCommissionsForTransaction(
            tx,
            transaction.id,
            new Prisma.Decimal(row.amount),
            customer.partner
          );
        });

        result.created += 1;
      } catch (err) {
        result.skipped.push({ nickname: row.nickname, amount: row.amount, reason: err.message });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    return success(res, result, `成功导入 ${result.created} 条，跳过 ${result.skipped.length} 条`);
  } catch (err) {
    logger.error('批量导入流水失败:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    return fail(res, '服务器内部错误', 500);
  }
};

// 预览 Excel。
const previewExcelImport = async (req, res) => {
  try {
    if (!req.file) return fail(res, '请上传 Excel 文件');

    const workbook = XLSX.readFile(req.file.path);
    const sheets = workbook.SheetNames
      .map((name) => {
        const worksheet = workbook.Sheets[name];
        const rows = parseExcelSheet(worksheet);
        return { name, rowCount: rows.length };
      })
      .filter((item) => item.rowCount > 0);

    const targetName =
      req.body.sheetName && sheets.find((item) => item.name === req.body.sheetName)
        ? req.body.sheetName
        : (sheets.length > 0 ? sheets[0].name : null);

    let previewRows = [];
    if (targetName) {
      previewRows = parseExcelSheet(workbook.Sheets[targetName]);
    }

    const customers = await prisma.customer.findMany({
      where: { status: 1 },
      select: { nickname: true },
    });
    const nicknameSet = new Set(customers.map((item) => item.nickname.trim()));

    const preview = previewRows.map((item) => ({
      ...item,
      matched: nicknameSet.has(item.nickname),
    }));

    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    return success(res, { sheets, preview });
  } catch (err) {
    logger.error('预览 Excel 失败:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    return fail(res, '服务器内部错误', 500);
  }
};

// 一键归档历史流水。
const archiveTransactions = async (req, res) => {
  try {
    const { endDate } = req.body;
    if (!endDate) {
      return fail(res, '请指定归档截止日期');
    }

    const targetDate = dayjs(endDate).endOf('day').toDate();
    const result = await prisma.transaction.updateMany({
      where: {
        orderDate: { lte: targetDate },
        isArchived: 0,
      },
      data: { isArchived: 1 },
    });

    return success(res, { count: result.count }, `成功归档 ${result.count} 条流水记录`);
  } catch (err) {
    logger.error('流水归档失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  createTransaction,
  updateTransaction,
  getTransactions,
  deleteTransaction,
  settlePartner,
  getSettlements,
  bulkImportTransactions,
  previewExcelImport,
  archiveTransactions,
};
