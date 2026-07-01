/**
 * Axios 请求封装
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：自动附加 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  (response) => {
    const { data } = response
    if (data.code === 200) {
      return data
    }

    if (!response.config?.skipErrorMessage) {
      ElMessage.error(data.message || '请求失败')
    }

    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error) => {
    const skipErrorMessage = error.config?.skipErrorMessage

    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
        router.push('/login')
        ElMessage.error('登录已过期，请重新登录')
      } else if (status === 403) {
        if (!skipErrorMessage) {
          ElMessage.error('无权限访问')
        }
      } else if (!skipErrorMessage) {
        ElMessage.error(data?.message || '服务器错误')
      }
    } else if (!skipErrorMessage) {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

export default request
