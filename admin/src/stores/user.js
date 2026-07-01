/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../utils/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const userInfo = ref((() => { try { return JSON.parse(localStorage.getItem('admin_user')) || {} } catch { return {} } })())

  const login = async (username, password) => {
    const res = await authApi.login({ username, password })
    token.value = res.data.token
    userInfo.value = res.data.userInfo
    localStorage.setItem('admin_token', res.data.token)
    localStorage.setItem('admin_user', JSON.stringify(res.data.userInfo))
    return res
  }

  const logout = () => {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  const isAdmin = () => userInfo.value.role === 'admin'

  return { token, userInfo, login, logout, isAdmin }
})
