/**
 * 移动端 API 接口定义
 */
import request from './request'
import axios from 'axios'

// 认证
export const authApi = {
  wechatLogin: (data) => request.post('/auth/wechat/login', data),
  wechatBind: (data) => request.post('/auth/wechat/bind', data),
  getWechatConfig: () => request.get('/auth/wechat/config'),
}

// 工作台
export const workbenchApi = {
  getData: () => request.get('/mobile/workbench'),
  getProjectionConfig: () => request.get('/mobile/projection-config'),
}

// 我的客户
export const customerApi = {
  getList: (params) => request.get('/mobile/customers', { params }),
}

// 我的团队
export const teamApi = {
  getList: () => request.get('/mobile/team'),
}

// 报备客户
export const reportApi = {
  submit: (data) => request.post('/mobile/report', data),
  getList: (params) => request.get('/mobile/reports', { params }),
}

// 佣金明细
export const commissionApi = {
  getList: (params) => request.get('/mobile/commissions', { params }),
}

// 结算记录
export const settlementApi = {
  getList: (params) => request.get('/mobile/settlements', { params }),
}

// 素材
export const materialApi = {
  getList: (params) => request.get('/mobile/materials', { params }),
}

// 话术
export const scriptApi = {
  getList: () => request.get('/mobile/scripts'),
}

// Q&A 反驳应对
export const qaApi = {
  getList: () => request.get('/mobile/qa'),
}

// 历史流水
export const transactionApi = {
  getList: (params) => request.get('/mobile/transactions', { params }),
}

// 记账本
export const ledgerApi = {
  create: (data) => request.post('/mobile/ledgers', data),
  getList: (params) => request.get('/mobile/ledgers', { params }),
  getStats: (params) => request.get('/mobile/ledgers/stats', { params }),
  remove: (id) => request.delete(`/mobile/ledgers/${id}`),
  update: (id, data) => request.put(`/mobile/ledgers/${id}`, data),
}

// 风控红线字典
export const riskWordApi = {
  getList: () => request.get('/mobile/risk-words'),
}


// ==================== 邀请码 & 客户端 ====================

// 客户端专用请求实例（使用 customer_token）
const customerRequest = axios.create({ baseURL: '/api', timeout: 15000 })
customerRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
customerRequest.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) return data
    return Promise.reject(new Error(data.message))
  },
  (error) => Promise.reject(error)
)

export const inviteApi = {
  validate: (code) => request.get(`/invite/validate/${code}`),
  register: (data) => request.post('/invite/register', data),
  login: (data) => request.post('/invite/login', data),
  // 客户端查账（用 customer_token）
  getDashboard: () => customerRequest.get('/invite/dashboard'),
  getTransactions: (params) => customerRequest.get('/invite/transactions', { params }),
}
