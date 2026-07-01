/**
 * 邀请码控制器 - 客户通过邀请码自动注册绑定 + 客户端查账
 */
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const dayjs = require('dayjs');
const config = require('../config');
const { success, paginate, fail } = require('../utils/response');
const logger = require('../utils/logger');

// 验证邀请码是否有效（客户打开邀请链接时调用）
const validateInviteCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return fail(res, '无效的邀请链接');
    }

    const partner = await prisma.partner.findUnique({
      where: { inviteCode: code },
      select: { id: true, name: true, status: true },
    });

    if (!partner) {
      return fail(res, '邀请码无效或已过期');
    }
    if (partner.status !== 1) {
      return fail(res, '该邀请码已失效');
    }

    return success(res, {
      valid: true,
      partnerName: maskName(partner.name),
    });
  } catch (err) {
    logger.error('验证邀请码失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 客户通过邀请码 + 微信授权自动注册绑定
const customerRegister = async (req, res) => {
  try {
    const { code, inviteCode, nickname } = req.body;
    if (!code || !inviteCode) {
      return fail(res, '缺少必要参数');
    }

    // 开发模式：code 以 dev_ 开头时跳过微信API
    let openid;
    if (code.startsWith('dev_')) {
      openid = `dev_customer_${code.replace('dev_', '')}`;
    } else {
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
      const tokenRes = await axios.get(tokenUrl);
      const { openid: wxOpenid, errcode, errmsg } = tokenRes.data;

      if (errcode) {
        logger.error('微信授权失败:', { errcode, errmsg });
        return fail(res, '微信授权失败，请重试');
      }
      openid = wxOpenid;
    }

    // 查找邀请码对应的合伙人
    const partner = await prisma.partner.findUnique({
      where: { inviteCode },
    });
    if (!partner || partner.status !== 1) {
      return fail(res, '邀请码无效');
    }

    // 检查该openid是否已是合伙人
    const existingPartner = await prisma.partner.findUnique({
      where: { openId: openid },
    });
    if (existingPartner) {
      // 已经是合伙人，直接返回合伙人token
      const token = jwt.sign(
        { id: existingPartner.id, openId: openid, type: 'partner' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      return success(res, {
        token,
        userType: 'partner',
        info: { id: existingPartner.id, name: existingPartner.name },
      }, '您已是合伙人，已自动登录');
    }

    // 检查该openid是否已是客户
    let customer = await prisma.customer.findUnique({
      where: { openId: openid },
    });

    if (customer) {
      // 已注册的客户，直接登录
      const token = jwt.sign(
        { id: customer.id, openId: openid, partnerId: customer.partnerId, type: 'customer' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      return success(res, {
        token,
        userType: 'customer',
        info: { id: customer.id, nickname: customer.nickname, partnerId: customer.partnerId },
      }, '登录成功');
    }

    // 新客户：自动注册并归属到该合伙人名下
    const displayName = nickname || `用户${openid.substring(openid.length - 6)}`;
    customer = await prisma.customer.create({
      data: {
        nickname: displayName,
        openId: openid,
        partnerId: partner.id,
        remark: `通过邀请码 ${inviteCode} 自动注册`,
      },
    });

    const token = jwt.sign(
      { id: customer.id, openId: openid, partnerId: customer.partnerId, type: 'customer' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return success(res, {
      token,
      userType: 'customer',
      info: { id: customer.id, nickname: customer.nickname, partnerId: customer.partnerId },
      isNew: true,
    }, '注册成功，已自动绑定');
  } catch (err) {
    logger.error('客户注册失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 客户微信静默登录（已注册客户再次打开）
const customerLogin = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return fail(res, '缺少微信授权code');
    }

    // 开发模式：code 以 dev_ 开头时跳过微信API
    let openid;
    if (code.startsWith('dev_')) {
      openid = `dev_customer_${code.replace('dev_', '')}`;
    } else {
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
      const tokenRes = await axios.get(tokenUrl);
      const { openid: wxOpenid, errcode } = tokenRes.data;

      if (errcode) {
        return fail(res, '微信授权失败，请重试');
      }
      openid = wxOpenid;
    }

    // 先查是否是合伙人
    const partner = await prisma.partner.findUnique({ where: { openId: openid } });
    if (partner) {
      const token = jwt.sign(
        { id: partner.id, openId: openid, type: 'partner' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      return success(res, { token, userType: 'partner', info: { id: partner.id, name: partner.name } });
    }

    // 再查是否是客户
    const customer = await prisma.customer.findUnique({ where: { openId: openid } });
    if (customer) {
      const token = jwt.sign(
        { id: customer.id, openId: openid, partnerId: customer.partnerId, type: 'customer' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      return success(res, { token, userType: 'customer', info: { id: customer.id, nickname: customer.nickname } });
    }

    return fail(res, '未注册，请通过邀请链接进入', 403);
  } catch (err) {
    logger.error('客户登录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ==================== 客户端查账接口 ====================

// 客户工作台（今日流水 / 本月流水 / 实时数据）
const getCustomerDashboard = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const todayStart = dayjs().startOf('day').toDate();

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, nickname: true, createdAt: true },
    });

    const [todayTurnover, monthTurnover, totalTurnover, todayOrders, monthOrders] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { customerId, orderDate: { gte: todayStart }, isArchived: 0 },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { customerId, isArchived: 0 },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { customerId },
      }),
      prisma.transaction.count({
        where: { customerId, orderDate: { gte: todayStart }, isArchived: 0 },
      }),
      prisma.transaction.count({
        where: { customerId, isArchived: 0 },
      }),
    ]);

    return success(res, {
      customer,
      stats: {
        todayTurnover: todayTurnover._sum.amount || 0,
        todayOrders,
        monthTurnover: monthTurnover._sum.amount || 0,
        monthOrders,
        totalTurnover: totalTurnover._sum.amount || 0,
      },
    });
  } catch (err) {
    logger.error('获取客户看板失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 客户流水明细
const getCustomerTransactions = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const [list, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { customerId },
        skip,
        take: parseInt(pageSize),
        select: {
          id: true,
          amount: true,
          orderDate: true,
          remark: true,
          createdAt: true,
        },
        orderBy: { orderDate: 'desc' },
      }),
      prisma.transaction.count({ where: { customerId } }),
    ]);

    return paginate(res, list, total, parseInt(page), parseInt(pageSize));
  } catch (err) {
    logger.error('获取客户流水失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// ========== 工具函数 ==========
const maskName = (name) => {
  if (!name) return '***';
  if (name.length <= 1) return '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
};

module.exports = {
  validateInviteCode,
  customerRegister,
  customerLogin,
  getCustomerDashboard,
  getCustomerTransactions,
};
