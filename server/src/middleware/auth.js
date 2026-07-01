/**
 * JWT 认证中间件 & RBAC 权限校验
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('../utils/response');

// JWT 验证中间件
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, role, type }
    next();
  } catch (err) {
    return unauthorized(res, '登录已过期，请重新登录');
  }
};

// 角色权限校验中间件工厂（支持多角色）
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(res);
    }
    next();
  };
};

// 合伙人端认证中间件（基于 OpenID 的 JWT）
const authenticatePartner = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, '请先通过微信授权登录');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'partner') {
      return forbidden(res, '无权限访问，请联系管理员开通');
    }
    req.partner = decoded; // { id, openId, type }
    next();
  } catch (err) {
    return unauthorized(res, '登录已过期，请重新授权');
  }
};

// 客户端认证中间件（通过邀请码注册的客户）
const authenticateCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, '请先通过邀请链接授权登录');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.type !== 'customer') {
      return forbidden(res, '无权限访问');
    }
    req.customer = decoded; // { id, openId, partnerId, type }
    next();
  } catch (err) {
    return unauthorized(res, '登录已过期，请重新授权');
  }
};

module.exports = { authenticate, authorize, authenticatePartner, authenticateCustomer };
