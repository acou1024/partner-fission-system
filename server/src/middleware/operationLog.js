/**
 * 操作日志记录中间件
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// 记录操作日志
const logOperation = (module, action) => {
  return async (req, res, next) => {
    // 保存原始的 res.json 方法
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // 仅在操作成功时记录日志
      if (body && body.code === 200 && req.user) {
        prisma.operationLog.create({
          data: {
            module,
            action,
            detail: JSON.stringify({
              params: req.params,
              body: sanitizeBody(req.body),
              result: body.message,
            }),
            ip: req.ip || req.connection?.remoteAddress || '',
            userId: req.user.id,
          },
        }).catch(err => {
          logger.error('记录操作日志失败:', err);
        });
      }
      return originalJson(body);
    };

    next();
  };
};

// 清理请求体中的敏感信息（如密码）
const sanitizeBody = (body) => {
  if (!body) return {};
  const sanitized = { ...body };
  if (sanitized.password) sanitized.password = '******';
  return sanitized;
};

module.exports = { logOperation };
