/**
 * API 接口定义
 */
import request from './request'

// ==================== 认证 ====================
export const authApi = {
  login: (data) => request.post('/auth/login', data),
  getUserInfo: () => request.get('/auth/userinfo'),
  changePassword: (data) => request.put('/auth/password', data),
}

// ==================== 数据大盘 ====================
export const dashboardApi = {
  getOverview: () => request.get('/admin/dashboard/overview'),
  getRanking: (params) => request.get('/admin/dashboard/ranking', { params }),
}

// ==================== 合伙人管理 ====================
export const partnerApi = {
  getList: (params) => request.get('/admin/partners', { params }),
  getDetail: (id) => request.get(`/admin/partners/${id}`),
  create: (data) => request.post('/admin/partners', data),
  update: (id, data) => request.put(`/admin/partners/${id}`, data),
  delete: (id) => request.delete(`/admin/partners/${id}`),
  getQrCode: (id) => request.get(`/admin/partners/${id}/qrcode`),
  unbindWechat: (id) => request.post(`/admin/partners/${id}/unbind-wechat`),
}

// ==================== 客户管理 ====================
export const customerApi = {
  getList: (params) => request.get('/admin/customers', { params }),
  create: (data) => request.post('/admin/customers', data),
  update: (id, data) => request.put(`/admin/customers/${id}`, data),
  delete: (id) => request.delete(`/admin/customers/${id}`),
}

// ==================== 客户报备 ====================
export const reportApi = {
  getList: (params) => request.get('/admin/reports', { params }),
  review: (id, data) => request.put(`/admin/reports/${id}/review`, data),
}

// ==================== 流水账单 ====================
export const transactionApi = {
  getList: (params) => request.get('/admin/transactions', { params }),
  create: (data) => request.post('/admin/transactions', data),
  update: (id, data) => request.put(`/admin/transactions/${id}`, data),
  delete: (id) => request.delete(`/admin/transactions/${id}`),
  archive: (data) => request.post('/admin/transactions/archive', data),
  previewImport: (formData) => request.post('/admin/transactions/import-preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importExcel: (formData) => request.post('/admin/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

// ==================== 结算管理 ====================
export const settlementApi = {
  getList: (params) => request.get('/admin/settlements', { params }),
  getMonthlyStats: (params) => request.get('/admin/settlements/monthly', { params }),
  create: (data) => request.post('/admin/settlements', data),
}

// ==================== 手工记账本 ====================
export const ledgerApi = {
  getList: (params) => request.get('/admin/ledgers', { params }),
}

// ==================== 素材管理 ====================
export const materialApi = {
  getList: (params) => request.get('/admin/materials', { params }),
  upload: (formData) => request.post('/admin/materials', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => request.delete(`/admin/materials/${id}`),
  clean: (data) => request.post('/admin/materials/clean', data),
}

// ==================== 话术管理 ====================
export const scriptApi = {
  getCategories: () => request.get('/admin/scripts/categories'),
  createCategory: (data) => request.post('/admin/scripts/categories', data),
  updateCategory: (id, data) => request.put(`/admin/scripts/categories/${id}`, data),
  deleteCategory: (id) => request.delete(`/admin/scripts/categories/${id}`),
  createScript: (data) => request.post('/admin/scripts', data),
  updateScript: (id, data) => request.put(`/admin/scripts/${id}`, data),
  deleteScript: (id) => request.delete(`/admin/scripts/${id}`),
  bulkImport: (data) => request.post('/admin/scripts/bulk-import', data),
}

// ==================== Q&A 反驳应对 ====================
export const qaApi = {
  getList: () => request.get('/admin/qa'),
  create: (data) => request.post('/admin/qa', data),
  update: (id, data) => request.put(`/admin/qa/${id}`, data),
  delete: (id) => request.delete(`/admin/qa/${id}`),
}

// ==================== 风控红线字典 ====================
export const riskWordApi = {
  getList: () => request.get('/admin/risk-words'),
  create: (data) => request.post('/admin/risk-words', data),
  update: (id, data) => request.put(`/admin/risk-words/${id}`, data),
  delete: (id) => request.delete(`/admin/risk-words/${id}`),
}

// ==================== 系统管理 ====================
export const systemApi = {
  // 域名管理
  getDomains: () => request.get('/admin/system/domains'),
  addDomain: (data) => request.post('/admin/system/domains', data),
  switchDomain: (id) => request.put(`/admin/system/domains/${id}/switch`),
  deleteDomain: (id) => request.delete(`/admin/system/domains/${id}`),
  // 员工管理
  getStaffList: (params) => request.get('/admin/system/staff', { params }),
  createStaff: (data) => request.post('/admin/system/staff', data),
  updateStaff: (id, data) => request.put(`/admin/system/staff/${id}`, data),
  deleteStaff: (id) => request.delete(`/admin/system/staff/${id}`),
  // 系统配置
  getConfigs: () => request.get('/admin/system/configs'),
  updateConfigs: (data) => request.put('/admin/system/configs', data),
  // 操作日志
  getLogs: (params) => request.get('/admin/system/logs', { params }),
}

// ==================== 方案赔率管理 ====================
export const schemeApi = {
  getList: (params) => request.get('/admin/schemes', { params }),
  create: (data) => request.post('/admin/schemes', data),
  copy: (data) => request.post('/admin/schemes/copy', data),
  update: (id, data) => request.put(`/admin/schemes/${id}`, data),
  delete: (id) => request.delete(`/admin/schemes/${id}`),
}

// ==================== 客户盈利汇总 ====================
export const customerProfitApi = {
  getList: (params, config = {}) => request.get('/admin/customer-profits', { params, ...config }),
}
