/**
 * Redis 客户端封装 - 用于缓存和防频控制
 */
const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

let redis = null;

try {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis 连接失败，将使用内存降级模式');
        return null; // 停止重试
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    logger.warn('Redis 连接异常（系统仍可正常运行）:', err.message);
  });

  redis.connect().catch(() => {
    logger.warn('Redis 未连接，降级为无缓存模式');
  });
} catch (err) {
  logger.warn('Redis 初始化失败，降级为无缓存模式');
}

// 安全的缓存操作（Redis不可用时静默降级）
const cache = {
  async get(key) {
    try {
      if (!redis || redis.status !== 'ready') return null;
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      if (!redis || redis.status !== 'ready') return;
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch { /* 降级 */ }
  },

  async del(key) {
    try {
      if (!redis || redis.status !== 'ready') return;
      await redis.del(key);
    } catch { /* 降级 */ }
  },

  // 防频控制：同一key在ttl秒内只允许N次操作
  async rateLimit(key, maxCount, windowSeconds) {
    try {
      if (!redis || redis.status !== 'ready') return true; // Redis不可用时放行
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      return current <= maxCount;
    } catch { return true; }
  },
};

module.exports = { redis, cache };
