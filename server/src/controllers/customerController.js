/**
 * 客户管理控制器（管理后台使用）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// 获取客户列表（分页 + 搜索）
const getCustomers = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, partnerId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = { status: 1 };
    if (keyword) {
      where.nickname = { contains: keyword };
    }
    if (partnerId) {
      where.partnerId = parseInt(partnerId);
    }
    // 员工只能看自己名下合伙人的客户
    if (req.user.role === 'staff') {
      where.partner = { staffId: req.user.id };
    }

    const [list, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        include: {
          partner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取客户列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建客户（员工手动添加，或审核报备后自动创建）
const createCustomer = async (req, res) => {
  try {
    const { nickname, partnerId, remark } = req.body;
    if (!nickname || !partnerId) {
      return fail(res, '客户昵称和归属合伙人不能为空');
    }

    // 校验合伙人是否存在
    const partner = await prisma.partner.findUnique({ where: { id: parseInt(partnerId) } });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }

    const customer = await prisma.customer.create({
      data: {
        nickname,
        partnerId: parseInt(partnerId),
        remark: remark || null,
      },
    });

    return success(res, customer, '客户添加成功');
  } catch (err) {
    logger.error('创建客户失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新客户信息
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, remark, partnerId, status } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return fail(res, '客户不存在');
    }

    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (remark !== undefined) updateData.remark = remark;
    if (partnerId !== undefined) updateData.partnerId = parseInt(partnerId);
    if (status !== undefined) updateData.status = parseInt(status);

    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return success(res, customer, '客户信息更新成功');
  } catch (err) {
    logger.error('更新客户失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除客户（软删除）
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: { status: 0 },
    });
    return success(res, null, '客户已删除');
  } catch (err) {
    logger.error('删除客户失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 审核客户报备
const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved / rejected

    if (!['approved', 'rejected'].includes(status)) {
      return fail(res, '无效的审核状态');
    }

    const report = await prisma.customerReport.findUnique({
      where: { id: parseInt(id) },
    });
    if (!report) {
      return fail(res, '报备记录不存在');
    }
    if (report.status !== 'pending') {
      return fail(res, '该报备已处理');
    }

    // 更新报备状态
    await prisma.customerReport.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    // 如果审核通过，自动创建客户记录
    if (status === 'approved') {
      await prisma.customer.create({
        data: {
          nickname: report.nickname,
          partnerId: report.partnerId,
          remark: `来自合伙人报备 #${report.id}`,
        },
      });
    }

    return success(res, null, status === 'approved' ? '审核通过，客户已添加' : '报备已拒绝');
  } catch (err) {
    logger.error('审核报备失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取待审核报备列表
const getPendingReports = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status = 'pending' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (status) {
      where.status = status;
    }
    // 员工只能看自己名下合伙人的报备
    if (req.user.role === 'staff') {
      where.partner = { staffId: req.user.id };
    }

    const [list, total] = await Promise.all([
      prisma.customerReport.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        include: {
          partner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customerReport.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取报备列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  reviewReport,
  getPendingReports,
};
