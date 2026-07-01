/**
 * 合伙人管理控制器（管理后台使用）
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { nanoid } = require('nanoid');
const QRCode = require('qrcode');
const config = require('../config');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// 获取合伙人列表（分页 + 搜索）
const getPartners = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, staffId, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    // 员工只能看自己名下的合伙人
    if (req.user.role === 'staff') {
      where.staffId = req.user.id;
    } else if (staffId) {
      where.staffId = parseInt(staffId);
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { wechatId: { contains: keyword } },
      ];
    }
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    }

    const [list, total] = await Promise.all([
      prisma.partner.findMany({
        where,
        skip,
        take: parseInt(pageSize),
        include: {
          staff: { select: { id: true, realName: true } },
          parent: { select: { id: true, name: true } },
          _count: { select: { customers: true, children: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partner.count({ where }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取合伙人列表失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取合伙人详情
const getPartnerDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({
      where: { id: parseInt(id) },
      include: {
        staff: { select: { id: true, realName: true } },
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true, phone: true, status: true } },
        _count: { select: { customers: true, children: true, commissions: true } },
      },
    });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }
    return success(res, partner);
  } catch (err) {
    logger.error('获取合伙人详情失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 创建合伙人
const createPartner = async (req, res) => {
  try {
    const { name, wechatId, phone, parentId, directRate, teamRate, rateMode, tieredRates } = req.body;
    if (!name) {
      return fail(res, '合伙人姓名不能为空');
    }

    // 生成唯一邀请码
    const inviteCode = nanoid(12);

    // 确定所属员工
    const staffId = req.user.role === 'staff' ? req.user.id : (req.body.staffId || req.user.id);

    // 如果指定了上级合伙人，校验是否存在
    if (parentId) {
      const parentPartner = await prisma.partner.findUnique({ where: { id: parseInt(parentId) } });
      if (!parentPartner) {
        return fail(res, '上级合伙人不存在');
      }
      // 校验上级合伙人是否也有上级（最多两级）
      if (parentPartner.parentId) {
        return fail(res, '最多支持两级合伙人关系');
      }
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        wechatId: wechatId || null,
        phone: phone || null,
        inviteCode,
        directRate: directRate || config.defaultRates.direct,
        teamRate: teamRate || config.defaultRates.team,
        rateMode: rateMode || 'fixed',
        tieredRates: tieredRates || null,
        staffId: parseInt(staffId),
        parentId: parentId ? parseInt(parentId) : null,
      },
    });

    return success(res, partner, '合伙人创建成功');
  } catch (err) {
    logger.error('创建合伙人失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 更新合伙人信息
const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, wechatId, phone, directRate, teamRate, rateMode, tieredRates, status } = req.body;

    const existing = await prisma.partner.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return fail(res, '合伙人不存在');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (wechatId !== undefined) updateData.wechatId = wechatId;
    if (phone !== undefined) updateData.phone = phone;
    if (directRate !== undefined) updateData.directRate = parseFloat(directRate);
    if (teamRate !== undefined) updateData.teamRate = parseFloat(teamRate);
    if (rateMode !== undefined) updateData.rateMode = rateMode;
    if (tieredRates !== undefined) updateData.tieredRates = tieredRates;
    if (status !== undefined) updateData.status = parseInt(status);
    if (req.body.parentId !== undefined) updateData.parentId = req.body.parentId ? parseInt(req.body.parentId) : null;

    const partner = await prisma.partner.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return success(res, partner, '合伙人信息更新成功');
  } catch (err) {
    logger.error('更新合伙人失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 删除合伙人（软删除：设为冻结）
const deletePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { children: true } } },
    });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }
    if (partner._count.children > 0) {
      return fail(res, '该合伙人下有下级合伙人，无法删除');
    }

    await prisma.partner.update({
      where: { id: parseInt(id) },
      data: { status: 0 },
    });

    return success(res, null, '合伙人已冻结');
  } catch (err) {
    logger.error('删除合伙人失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 生成合伙人专属邀请二维码
const generateQrCode = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({ where: { id: parseInt(id) } });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }

    // 生成邀请链接（使用落地域名）
    const inviteUrl = `${config.domain.landing}/m/invite/${partner.inviteCode}`;

    // 生成二维码（Base64格式）
    const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return success(res, {
      inviteCode: partner.inviteCode,
      inviteUrl,
      qrCode: qrCodeDataUrl,
    });
  } catch (err) {
    logger.error('生成二维码失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 解绑合伙人微信
const unbindWechat = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await prisma.partner.findUnique({ where: { id: parseInt(id) } });
    if (!partner) {
      return fail(res, '合伙人不存在');
    }
    if (!partner.openId) {
      return fail(res, '该合伙人尚未绑定微信');
    }

    await prisma.partner.update({
      where: { id: parseInt(id) },
      data: { openId: null, boundAt: null },
    });

    return success(res, null, '微信解绑成功');
  } catch (err) {
    logger.error('解绑微信失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

module.exports = {
  getPartners,
  getPartnerDetail,
  createPartner,
  updatePartner,
  deletePartner,
  generateQrCode,
  unbindWechat,
};
