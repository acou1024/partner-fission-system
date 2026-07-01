const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// ==================== 合伙人端接口 ====================

// 1. 记一笔（创建手工账本）
const createLedger = async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { title, investAmount, returnAmount, recordDate } = req.body;

        if (investAmount === undefined || returnAmount === undefined) {
            return fail(res, '投入资金和回流资金不能为空');
        }

        const invest = parseFloat(investAmount);
        const returns = parseFloat(returnAmount);
        const profitAmount = returns - invest;

        const rDate = recordDate ? new Date(recordDate) : new Date();

        const ledger = await prisma.ledger.create({
            data: {
                partnerId,
                title: title || '未分类',
                investAmount: invest,
                returnAmount: returns,
                profitAmount,
                recordDate: rDate,
            },
        });

        return success(res, ledger, '记账成功');
    } catch (err) {
        logger.error('创建手工记账失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

// 2. 获取我的手工账本（分页，按天倒序）
const getMyLedgers = async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { page = 1, pageSize = 20, month } = req.query; // month 可选，例如 2026-03
        const skip = (parseInt(page) - 1) * parseInt(pageSize);

        const where = { partnerId };
        if (month) {
            const start = dayjs(month).startOf('month').toDate();
            const end = dayjs(month).endOf('month').toDate();
            where.recordDate = { gte: start, lte: end };
        }

        const [list, total] = await Promise.all([
            prisma.ledger.findMany({
                where,
                skip,
                take: parseInt(pageSize),
                orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.ledger.count({ where }),
        ]);

        return paginate(res, list, total, parseInt(page), parseInt(pageSize));
    } catch (err) {
        logger.error('获取记账明细失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

// 3. 获取我的手工账本数据统计 (总投入/总回流/总盈利)
const getMyLedgerStats = async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { month } = req.query; // 如果传月份则查当月，否则查所有

        const where = { partnerId };
        if (month) {
            const start = dayjs(month).startOf('month').toDate();
            const end = dayjs(month).endOf('month').toDate();
            where.recordDate = { gte: start, lte: end };
        }

        const aggregate = await prisma.ledger.aggregate({
            _sum: {
                investAmount: true,
                returnAmount: true,
                profitAmount: true,
            },
            where,
        });

        return success(res, {
            totalInvest: aggregate._sum.investAmount || 0,
            totalReturn: aggregate._sum.returnAmount || 0,
            totalProfit: aggregate._sum.profitAmount || 0,
        });
    } catch (err) {
        logger.error('获取记账统计失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

// ==================== 管理端接口 ====================

// 获取所有合伙人的手工账本
const getAllLedgers = async (req, res) => {
    try {
        const { page = 1, pageSize = 20, partnerId, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(pageSize);

        const where = {};
        if (partnerId) {
            where.partnerId = parseInt(partnerId);
        }
        if (startDate || endDate) {
            where.recordDate = {};
            if (startDate) where.recordDate.gte = new Date(startDate);
            if (endDate) where.recordDate.lte = new Date(endDate + 'T23:59:59.999Z');
        }

        // 员工只能看自己名下合伙人
        if (req.user.role === 'staff') {
            where.partner = { staffId: req.user.id };
        }

        const [list, total] = await Promise.all([
            prisma.ledger.findMany({
                where,
                skip,
                take: parseInt(pageSize),
                include: {
                    partner: { select: { id: true, name: true, wechatId: true, staff: { select: { id: true, realName: true } } } },
                },
                orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma.ledger.count({ where }),
        ]);

        return paginate(res, list, total, parseInt(page), parseInt(pageSize));
    } catch (err) {
        logger.error('获取所有记账明细失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

// 删除记账记录（合伙人只能删自己的）
const deleteLedger = async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { id } = req.params;

        const ledger = await prisma.ledger.findUnique({ where: { id: parseInt(id) } });
        if (!ledger) {
            return fail(res, '记录不存在');
        }
        if (ledger.partnerId !== partnerId) {
            return fail(res, '无权删除此记录', 403);
        }

        await prisma.ledger.delete({ where: { id: parseInt(id) } });
        return success(res, null, '删除成功');
    } catch (err) {
        logger.error('删除记账记录失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

// 编辑记账记录（合伙人只能改自己的）
const updateLedger = async (req, res) => {
    try {
        const partnerId = req.partner.id;
        const { id } = req.params;
        const { title, investAmount, returnAmount, recordDate } = req.body;

        const ledger = await prisma.ledger.findUnique({ where: { id: parseInt(id) } });
        if (!ledger) {
            return fail(res, '记录不存在');
        }
        if (ledger.partnerId !== partnerId) {
            return fail(res, '无权修改此记录', 403);
        }

        const invest = investAmount !== undefined ? parseFloat(investAmount) : Number(ledger.investAmount);
        const returns = returnAmount !== undefined ? parseFloat(returnAmount) : Number(ledger.returnAmount);
        const profitAmount = returns - invest;

        const updateData = { profitAmount };
        if (title !== undefined) updateData.title = title;
        if (investAmount !== undefined) updateData.investAmount = invest;
        if (returnAmount !== undefined) updateData.returnAmount = returns;
        if (recordDate) updateData.recordDate = new Date(recordDate);

        const updated = await prisma.ledger.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        return success(res, updated, '修改成功');
    } catch (err) {
        logger.error('修改记账记录失败:', err);
        return fail(res, '服务器内部错误', 500);
    }
};

module.exports = {
    createLedger,
    getMyLedgers,
    getMyLedgerStats,
    getAllLedgers,
    deleteLedger,
    updateLedger,
};
