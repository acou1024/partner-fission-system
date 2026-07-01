/**
 * 系统配置控制器 - 域名管理、系统配置、员工管理、操作日志
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// ==================== 域名管理 ====================

// 获取域名列表
const getDomains = async (req, res) => {
  try {
    const domains = await prisma.domainConfig.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return success(res, domains);
  } catch (err) {
    logger.error('获取域名列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 添加域名
const addDomain = async (req, res) => {
  try {
    const { domain, type, remark } = req.body;
    if (!domain || !type) {
      return fail(res, '域名和类型不能为空');
    }
    if (!['entry', 'landing'].includes(type)) {
      return fail(res, '域名类型无效，必须是 entry 或 landing');
    }

    const domainConfig = await prisma.domainConfig.create({
      data: { domain, type, remark: remark || null },
    });

    return success(res, domainConfig, '域名添加成功');
  } catch (err) {
    logger.error('添加域名失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 一键切换主域名
const switchDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.domainConfig.findUnique({ where: { id: parseInt(id) } });
    if (!target) {
      return fail(res, '域名不存在');
    }

    // 将同类型的所有域名设为非激活，再激活目标域名
    await prisma.$transaction([
      prisma.domainConfig.updateMany({
        where: { type: target.type },
        data: { isActive: 0 },
      }),
      prisma.domainConfig.update({
        where: { id: parseInt(id) },
        data: { isActive: 1 },
      }),
    ]);

    return success(res, null, `已切换${target.type === 'entry' ? '入口' : '落地'}域名为: ${target.domain}`);
  } catch (err) {
    logger.error('切换域名失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除域名
const deleteDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const domain = await prisma.domainConfig.findUnique({ where: { id: parseInt(id) } });
    if (!domain) {
      return fail(res, '域名不存在');
    }
    if (domain.isActive === 1) {
      return fail(res, '不能删除当前激活的域名，请先切换到其他域名');
    }

    await prisma.domainConfig.delete({ where: { id: parseInt(id) } });
    return success(res, null, '域名已删除');
  } catch (err) {
    logger.error('删除域名失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ==================== 员工管理（仅管理员） ====================

// 获取员工列表
const getStaffList = async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [list, total] = await Promise.all([
      prisma.sysUser.findMany({
        skip,
        take: parseInt(pageSize),
        select: { id: true, username: true, realName: true, phone: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sysUser.count(),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取员工列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建员工账号
const createStaff = async (req, res) => {
  try {
    const { username, password, realName, phone, role } = req.body;
    if (!username || !password || !realName) {
      return fail(res, '用户名、密码和姓名不能为空');
    }

    const existing = await prisma.sysUser.findUnique({ where: { username } });
    if (existing) {
      return fail(res, '用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.sysUser.create({
      data: {
        username,
        password: hashedPassword,
        realName,
        phone: phone || null,
        role: role || 'staff',
      },
    });

    return success(res, {
      id: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role,
    }, '员工账号创建成功');
  } catch (err) {
    logger.error('创建员工失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新员工信息
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { realName, phone, role, status, password } = req.body;

    const updateData = {};
    if (realName !== undefined) updateData.realName = realName;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = parseInt(status);
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.sysUser.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: { id: true, username: true, realName: true, phone: true, role: true, status: true },
    });

    return success(res, user, '员工信息更新成功');
  } catch (err) {
    logger.error('更新员工失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除员工（禁用）
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return fail(res, '不能删除自己的账号');
    }

    await prisma.sysUser.update({
      where: { id: parseInt(id) },
      data: { status: 0 },
    });

    return success(res, null, '员工已禁用');
  } catch (err) {
    logger.error('删除员工失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ==================== 系统配置 ====================

// 获取系统配置
const getSystemConfigs = async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    // 转换为 key-value 对象
    const configMap = {};
    configs.forEach(c => { configMap[c.configKey] = c.configValue; });
    return success(res, configMap);
  } catch (err) {
    logger.error('获取系统配置失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新系统配置
const updateSystemConfig = async (req, res) => {
  try {
    const { configs } = req.body; // { key: value, key2: value2 }
    if (!configs || typeof configs !== 'object') {
      return fail(res, '配置数据格式无效');
    }

    for (const [key, value] of Object.entries(configs)) {
      await prisma.systemConfig.upsert({
        where: { configKey: key },
        update: { configValue: String(value) },
        create: { configKey: key, configValue: String(value) },
      });
    }

    return success(res, null, '系统配置更新成功');
  } catch (err) {
    logger.error('更新系统配置失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ==================== 操作日志 ====================

// 获取操作日志列表
const getOperationLogs = async (req, res) => {
  try {
    const { page = 1, pageSize = 30, module, userId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (module) where.module = module;
    if (userId) where.userId = parseInt(userId);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [list, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        include: {
          user: { select: { id: true, realName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.operationLog.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取操作日志失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getDomains,
  addDomain,
  switchDomain,
  deleteDomain,
  getStaffList,
  createStaff,
  updateStaff,
  deleteStaff,
  getSystemConfigs,
  updateSystemConfig,
  getOperationLogs,
};
