/**
 * 管理后台路由（老板 + 员工）
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const config = require('../config');
const { authenticate, authorize } = require('../middleware/auth');
const { logOperation } = require('../middleware/operationLog');

const partnerCtrl = require('../controllers/partnerController');
const customerCtrl = require('../controllers/customerController');
const transactionCtrl = require('../controllers/transactionController');
const dashboardCtrl = require('../controllers/dashboardController');
const knowledgeCtrl = require('../controllers/knowledgeController');
const systemCtrl = require('../controllers/systemController');
const qaCtrl = require('../controllers/qaController');
const ledgerCtrl = require('../controllers/ledgerController');
const profitCtrl = require('../controllers/profitController');
const settlementCtrl = require('../controllers/settlementController');

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    cb(null, ext && mime);
  },
});

// Excel 文件上传配置
const excelUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /xlsx|xls|csv/;
    const ext = allowedExts.test(path.extname(file.originalname).toLowerCase());
    cb(null, ext);
  },
});

// 所有管理后台路由都需要登录
router.use(authenticate);

// ==================== 数据大盘 ====================
router.get('/dashboard/overview', dashboardCtrl.getOverview);
router.get('/dashboard/ranking', dashboardCtrl.getRanking);

// ==================== 合伙人管理 ====================
router.get('/partners', partnerCtrl.getPartners);
router.get('/partners/:id', partnerCtrl.getPartnerDetail);
router.post('/partners', logOperation('合伙人管理', 'create'), partnerCtrl.createPartner);
router.put('/partners/:id', logOperation('合伙人管理', 'update'), partnerCtrl.updatePartner);
router.delete('/partners/:id', logOperation('合伙人管理', 'delete'), partnerCtrl.deletePartner);
router.get('/partners/:id/qrcode', partnerCtrl.generateQrCode);
router.post('/partners/:id/unbind-wechat', authorize('admin'), logOperation('合伙人管理', 'update'), partnerCtrl.unbindWechat);

// ==================== 客户管理 ====================
router.get('/customers', customerCtrl.getCustomers);
router.post('/customers', logOperation('客户管理', 'create'), customerCtrl.createCustomer);
router.put('/customers/:id', logOperation('客户管理', 'update'), customerCtrl.updateCustomer);
router.delete('/customers/:id', logOperation('客户管理', 'delete'), customerCtrl.deleteCustomer);

// ==================== 客户报备审核 ====================
router.get('/reports', customerCtrl.getPendingReports);
router.put('/reports/:id/review', logOperation('客户报备', 'review'), customerCtrl.reviewReport);

// ==================== 流水与佣金 ====================
router.get('/transactions', transactionCtrl.getTransactions);
router.post('/transactions', logOperation('流水录入', 'create'), transactionCtrl.createTransaction);
router.put('/transactions/:id', logOperation('流水录入', 'update'), transactionCtrl.updateTransaction);
router.delete('/transactions/:id', authorize('admin'), logOperation('流水录入', 'delete'), transactionCtrl.deleteTransaction);
router.post('/transactions/archive', authorize('admin'), logOperation('流水归档', 'archive'), transactionCtrl.archiveTransactions);
router.post('/transactions/import', excelUpload.single('file'), logOperation('流水录入', 'import'), transactionCtrl.bulkImportTransactions);
router.post('/transactions/import-preview', excelUpload.single('file'), transactionCtrl.previewExcelImport);

// ==================== 结算管理 ====================
router.get('/settlements', transactionCtrl.getSettlements);
router.post('/settlements', logOperation('结算管理', 'create'), transactionCtrl.settlePartner);
router.get('/settlements/monthly', authorize('admin'), settlementCtrl.getMonthlyStats);

// ==================== 手工记账本 ====================
router.get('/ledgers', ledgerCtrl.getAllLedgers);

// ==================== 素材管理 ====================
router.get('/materials', knowledgeCtrl.getMaterials);
router.post('/materials', upload.array('files', 20), logOperation('素材管理', 'upload'), knowledgeCtrl.uploadMaterial);
router.delete('/materials/:id', logOperation('素材管理', 'delete'), knowledgeCtrl.deleteMaterial);
router.post('/materials/clean', authorize('admin'), logOperation('素材管理', 'clean'), knowledgeCtrl.cleanOldMaterials);

// ==================== 话术管理 ====================
router.get('/scripts/categories', knowledgeCtrl.getScriptCategories);
router.post('/scripts/categories', logOperation('话术管理', 'create'), knowledgeCtrl.createScriptCategory);
router.put('/scripts/categories/:id', logOperation('话术管理', 'update'), knowledgeCtrl.updateScriptCategory);
router.delete('/scripts/categories/:id', logOperation('话术管理', 'delete'), knowledgeCtrl.deleteScriptCategory);
router.post('/scripts', logOperation('话术管理', 'create'), knowledgeCtrl.createScript);
router.put('/scripts/:id', logOperation('话术管理', 'update'), knowledgeCtrl.updateScript);
router.delete('/scripts/:id', logOperation('话术管理', 'delete'), knowledgeCtrl.deleteScript);
router.post('/scripts/bulk-import', logOperation('话术管理', 'import'), knowledgeCtrl.bulkImportScripts);

// ==================== 系统管理（仅管理员） ====================
router.get('/system/domains', authorize('admin'), systemCtrl.getDomains);
router.post('/system/domains', authorize('admin'), logOperation('域名管理', 'create'), systemCtrl.addDomain);
router.put('/system/domains/:id/switch', authorize('admin'), logOperation('域名管理', 'switch'), systemCtrl.switchDomain);
router.delete('/system/domains/:id', authorize('admin'), logOperation('域名管理', 'delete'), systemCtrl.deleteDomain);

router.get('/system/staff', authorize('admin'), systemCtrl.getStaffList);
router.post('/system/staff', authorize('admin'), logOperation('员工管理', 'create'), systemCtrl.createStaff);
router.put('/system/staff/:id', authorize('admin'), logOperation('员工管理', 'update'), systemCtrl.updateStaff);
router.delete('/system/staff/:id', authorize('admin'), logOperation('员工管理', 'delete'), systemCtrl.deleteStaff);

router.get('/system/configs', authorize('admin'), systemCtrl.getSystemConfigs);
router.put('/system/configs', authorize('admin'), logOperation('系统配置', 'update'), systemCtrl.updateSystemConfig);

router.get('/system/logs', authorize('admin'), systemCtrl.getOperationLogs);

// ==================== Q&A 反驳应对 ====================
router.get('/qa', qaCtrl.getQaList);
router.post('/qa', logOperation('QA管理', 'create'), qaCtrl.createQa);
router.put('/qa/:id', logOperation('QA管理', 'update'), qaCtrl.updateQa);
router.delete('/qa/:id', logOperation('QA管理', 'delete'), qaCtrl.deleteQa);

// ==================== 风控红线字典 ====================
router.get('/risk-words', qaCtrl.getRiskWordList);
router.post('/risk-words', logOperation('风控词管理', 'create'), qaCtrl.createRiskWord);
router.put('/risk-words/:id', logOperation('风控词管理', 'update'), qaCtrl.updateRiskWord);
router.delete('/risk-words/:id', logOperation('风控词管理', 'delete'), qaCtrl.deleteRiskWord);

// ==================== 方案赔率管理 ====================
router.get('/schemes', profitCtrl.getSchemes);
router.post('/schemes', logOperation('方案管理', 'create'), profitCtrl.createScheme);
router.post('/schemes/copy', logOperation('方案管理', 'copy'), profitCtrl.copySchemes);
router.put('/schemes/:id', logOperation('方案管理', 'update'), profitCtrl.updateScheme);
router.delete('/schemes/:id', logOperation('方案管理', 'delete'), profitCtrl.deleteScheme);

// ==================== 客户盈利汇总 ====================
router.get('/customer-profits', profitCtrl.getCustomerProfits);

module.exports = router;
