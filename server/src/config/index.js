/**
 * 系统全局配置
 */
require('dotenv').config();

module.exports = {
  // 服务器
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 微信服务号
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // 文件上传
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },

  // 域名
  domain: {
    entry: process.env.ENTRY_DOMAIN || 'http://localhost:3000',
    landing: process.env.LANDING_DOMAIN || 'http://localhost:3000',
  },

  // 默认分润比例（%）
  defaultRates: {
    direct: 3.00,  // 直推佣金比例
    team: 1.00,    // 团队佣金比例
  },
};
