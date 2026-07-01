/**
 * 邀请码 & 客户端路由
 */
const express = require('express');
const router = express.Router();
const { authenticateCustomer } = require('../middleware/auth');
const inviteCtrl = require('../controllers/inviteController');

// 公开接口（无需登录）
router.get('/validate/:code', inviteCtrl.validateInviteCode);     // 验证邀请码
router.post('/register', inviteCtrl.customerRegister);             // 客户通过邀请码注册
router.post('/login', inviteCtrl.customerLogin);                   // 客户微信登录

// 客户端查账接口（需客户登录）
router.get('/dashboard', authenticateCustomer, inviteCtrl.getCustomerDashboard);
router.get('/transactions', authenticateCustomer, inviteCtrl.getCustomerTransactions);

module.exports = router;
