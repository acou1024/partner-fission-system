/**
 * 合伙人移动端H5路由
 */
const express = require('express');
const router = express.Router();
const { authenticatePartner } = require('../middleware/auth');
const mobileCtrl = require('../controllers/mobileController');
const qaCtrl = require('../controllers/qaController');
const ledgerCtrl = require('../controllers/ledgerController');
const transactionCtrl = require('../controllers/transactionController');

// 所有移动端路由都需要合伙人身份验证
router.use(authenticatePartner);

// 工作台首页（对账大屏）
router.get('/workbench', mobileCtrl.getWorkbench);

// 我的客户
router.get('/customers', mobileCtrl.getMyCustomers);

// 我的团队（下级合伙人）
router.get('/team', mobileCtrl.getMyTeam);

// 报备客户
router.post('/report', mobileCtrl.reportCustomer);
router.get('/reports', mobileCtrl.getMyReports);

// 往期流水记录 (已归档的历史流水)
router.get('/transactions', mobileCtrl.getMyArchivedTransactions);

// 佣金明细
router.get('/commissions', mobileCtrl.getMyCommissions);

// 结算记录
router.get('/settlements', mobileCtrl.getMySettlements);

// 手工记账本
router.post('/ledgers', ledgerCtrl.createLedger);
router.get('/ledgers', ledgerCtrl.getMyLedgers);
router.get('/ledgers/stats', ledgerCtrl.getMyLedgerStats);
router.delete('/ledgers/:id', ledgerCtrl.deleteLedger);
router.put('/ledgers/:id', ledgerCtrl.updateLedger);

// 素材（方案图片）
router.get('/materials', mobileCtrl.getMaterials);

// 话术
router.get('/scripts', mobileCtrl.getScripts);

// 收益推演工具配置
router.get('/projection-config', mobileCtrl.getProjectionConfig);

// Q&A 反驳应对（只读）
router.get('/qa', qaCtrl.getQaList);

// 风控红线字典（只读）
router.get('/risk-words', qaCtrl.getRiskWordList);

// 客户画像提取（获取话术分类用于匹配）
router.get('/profiler-scripts', qaCtrl.getProfilerScripts);

module.exports = router;
