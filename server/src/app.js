/**
 * 私域合伙人裂变与分销核算系统 - 主入口
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');

// 路由
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mobileRoutes = require('./routes/mobileRoutes');
const inviteRoutes = require('./routes/inviteRoutes');

// BigInt JSON 序列化支持
BigInt.prototype.toJSON = function () { return Number(this); };

const app = express();

// ==================== 中间件 ====================

// CORS 跨域
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API 频率限制（防刷）
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 120,                 // 每IP最多120次请求
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
});
app.use('/api/', apiLimiter);

// 合伙人端数据要求导入后尽快可见，禁止浏览器或中间层缓存接口结果。
app.use('/api/mobile', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 静态文件服务（上传的图片）
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// 日志目录
const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ==================== 路由挂载 ====================

// 认证路由
app.use('/api/auth', authRoutes);

// 管理后台路由（老板 + 员工）
app.use('/api/admin', adminRoutes);

// 合伙人移动端路由
app.use('/api/mobile', mobileRoutes);

// 邀请码 & 客户端路由
app.use('/api/invite', inviteRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'OK', timestamp: new Date().toISOString() });
});

// 获取当前激活的落地域名（用于前端动态跳转）
app.get('/api/domain/active', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const domains = await prisma.domainConfig.findMany({
      where: { isActive: 1 },
    });
    const result = {};
    domains.forEach(d => { result[d.type] = d.domain; });
    res.json({ code: 200, data: result });
  } catch (err) {
    res.json({ code: 200, data: {} });
  }
});

// ==================== 错误处理 ====================

// 404
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在', data: null });
});

// 全局错误处理
app.use((err, req, res, next) => {
  logger.error('未捕获的异常:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
});

// ==================== 启动服务 ====================

app.listen(config.port, () => {
  logger.info(`🚀 服务已启动: http://localhost:${config.port}`);
  logger.info(`📌 运行环境: ${config.nodeEnv}`);

  // 启动定时任务（素材自动清理等）
  const { startScheduler } = require('./utils/scheduler');
  startScheduler();
});

module.exports = app;
