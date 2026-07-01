/**
 * 认证相关路由
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// 管理后台登录
router.post('/login', authController.adminLogin);

// 微信OAuth登录（合伙人）
router.post('/wechat/login', authController.wechatLogin);

// 微信绑定（新合伙人首次授权）
router.post('/wechat/bind', authController.wechatBind);

// 获取微信公众号配置（appId）
router.get('/wechat/config', authController.getWechatConfig);

// 获取当前用户信息（需登录）
router.get('/userinfo', authenticate, authController.getUserInfo);

// 修改密码（需登录）
router.put('/password', authenticate, authController.changePassword);

module.exports = router;
