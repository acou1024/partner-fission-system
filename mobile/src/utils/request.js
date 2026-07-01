/**
 * Axios 请求封装（移动端）
 */
import axios from 'axios'
import { showToast } from 'vant'
import router from '../router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('partner_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if ((config.method || 'get').toLowerCase() === 'get') {
      config.params = { ...(config.params || {}), _t: Date.now() }
      config.headers['Cache-Control'] = 'no-cache'
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) {
      return data
    }
    showToast({ message: data.message || '请求失败', position: 'bottom' })
    return Promise.reject(new Error(data.message))
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        localStorage.removeItem('partner_token')
        localStorage.removeItem('partner_info')
        router.push('/login')
        showToast({ message: '登录已过期，请重新授权', position: 'bottom' })
      } else if (status === 403) {
        showToast({ message: '无权限访问，请联系管理员开通', position: 'bottom' })
      } else {
        showToast({ message: data?.message || '网络错误', position: 'bottom' })
      }
    } else {
      showToast({ message: '网络连接失败', position: 'bottom' })
    }
    return Promise.reject(error)
  }
)

export default request
