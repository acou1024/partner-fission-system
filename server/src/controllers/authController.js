/**
 * 认证控制器 - 管理后台登录 & 微信OAuth登录
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const config = require('../config');
const { success, fail } = require('../utils/response');
const logger = require('../utils/logger');

// 管理后台 - 账号密码登录
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, '请输入用户名和密码');
    }

    const user = await prisma.sysUser.findUnique({ where: { username } });
    if (!user) {
      return fail(res, '用户名或密码错误');
    }
    if (user.status !== 1) {
      return fail(res, '账号已被禁用，请联系管理员');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return fail(res, '用户名或密码错误');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, type: 'admin' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return success(res, {
      token,
      userInfo: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role,
      },
    }, '登录成功');
  } catch (err) {
    logger.error('管理后台登录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 微信OAuth - 合伙人静默登录
const wechatLogin = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return fail(res, '缺少微信授权code');
    }

    let partner;

    // 开发模式：code 以 dev_ 开头时，跳过微信API，直接按合伙人ID查找
    if (config.nodeEnv === 'development' && code.startsWith('dev_')) {
      const devPartnerId = parseInt(code.replace('dev_', ''));
      partner = await prisma.partner.findUnique({
        where: { id: devPartnerId },
        include: { parent: { select: { id: true, name: true } } },
      });
    } else {
      // 正式模式：用 code 换取 access_token 和 openid
      const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
      const tokenRes = await axios.get(tokenUrl);
      const { openid, errcode, errmsg } = tokenRes.data;

      if (errcode) {
        logger.error('微信授权失败:', { errcode, errmsg });
        return fail(res, '微信授权失败，请重试');
      }

      // 查找是否已绑定合伙人
      partner = await prisma.partner.findUnique({
        where: { openId: openid },
        include: { parent: { select: { id: true, name: true } } },
      });
    }

    if (!partner) {
      return fail(res, '无权限访问，请联系管理员开通', 403);
    }
    if (partner.status !== 1) {
      return fail(res, '账号已被冻结，请联系管理员');
    }

    const token = jwt.sign(
      { id: partner.id, openId: partner.openId || 'dev', type: 'partner' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return success(res, {
      token,
      partnerInfo: {
        id: partner.id,
        name: partner.name,
        balance: partner.balance,
        totalEarnings: partner.totalEarnings,
      },
    }, '登录成功');
  } catch (err) {
    logger.error('微信登录失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 微信OAuth - 扫码绑定（新合伙人首次授权绑定OpenID）
const wechatBind = async (req, res) => {
  try {
    const { code, inviteCode } = req.body;
    if (!code || !inviteCode) {
      return fail(res, '缺少必要参数');
    }

    // 用 code 换取 openid
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.wechat.appId}&secret=${config.wechat.appSecret}&code=${code}&grant_type=authorization_code`;
    const tokenRes = await axios.get(tokenUrl);
    const { openid, errcode, errmsg } = tokenRes.data;

    if (errcode) {
      logger.error('微信授权失败:', { errcode, errmsg });
      return fail(res, '微信授权失败，请重试');
    }

    // 检查邀请码是否有效
    const partner = await prisma.partner.findUnique({
      where: { inviteCode },
    });
    if (!partner) {
      return fail(res, '无效的邀请链接');
    }
    if (partner.openId) {
      return fail(res, '该合伙人账号已被绑定');
    }

    // 检查 openid 是否已被其他合伙人绑定
    const existing = await prisma.partner.findUnique({
      where: { openId: openid },
    });
    if (existing) {
      return fail(res, '该微信已绑定其他合伙人账号');
    }

    // 绑定 OpenID
    const updated = await prisma.partner.update({
      where: { inviteCode },
      data: { openId: openid, boundAt: new Date() },
    });

    const token = jwt.sign(
      { id: updated.id, openId: openid, type: 'partner' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return success(res, {
      token,
      partnerInfo: {
        id: updated.id,
        name: updated.name,
        balance: updated.balance,
      },
    }, '绑定成功');
  } catch (err) {
    logger.error('微信绑定失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取当前登录用户信息
const getUserInfo = async (req, res) => {
  try {
    const user = await prisma.sysUser.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, realName: true, phone: true, role: true, status: true },
    });
    if (!user) {
      return fail(res, '用户不存在');
    }
    return success(res, user);
  } catch (err) {
    logger.error('获取用户信息失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 修改密码
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return fail(res, '请输入原密码和新密码');
    }
    if (newPassword.length < 6) {
      return fail(res, '新密码不能少于6位');
    }

    const user = await prisma.sysUser.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return fail(res, '原密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.sysUser.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return success(res, null, '密码修改成功');
  } catch (err) {
    logger.error('修改密码失败:', err);
    return fail(res, '服务器内部错误', 500);
  }
};

// 获取微信公众号配置（仅返回appId，不暴露secret）
const getWechatConfig = async (req, res) => {
  return success(res, { appId: config.wechat.appId });
};

module.exports = { adminLogin, wechatLogin, wechatBind, getUserInfo, changePassword, getWechatConfig };
