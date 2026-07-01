<template>
  <div class="login-page">
    <div class="login-logo">合伙人中心</div>

    <!-- 微信环境：自动授权中 -->
    <div v-if="isWechat && !isDev" class="login-status">
      <van-loading size="24px" vertical color="#d4a54e">正在授权登录中...</van-loading>
    </div>

    <!-- 非微信环境提示 -->
    <div v-if="!isWechat && !isDev" class="glass-card" style="margin-top: 40px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
      <div style="color: var(--text-primary); font-size: 16px; font-weight: 600; margin-bottom: 8px;">请在微信中打开</div>
      <div style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">
        复制当前页面链接，在微信内打开<br/>即可自动授权登录
      </div>
    </div>

    <!-- 开发环境模拟登录 -->
    <div class="glass-card" v-if="isDev" style="margin-top: 40px;">
      <div style="color: var(--accent-blue); font-size: 14px; margin-bottom: 16px;">开发模式 - 模拟登录</div>
      <van-field v-model="devPartnerId" label="合伙人ID" placeholder="输入合伙人ID" type="digit" />
      <van-button type="primary" block round style="margin-top: 16px;" @click="devLogin">模拟登录</van-button>
      <van-button plain type="primary" block round style="margin-top: 8px;" @click="testWechatAuth">测试微信授权跳转</van-button>
    </div>

    <!-- 授权失败提示 -->
    <div v-if="authError" class="glass-card" style="margin-top: 20px; text-align: center;">
      <div style="color: #ff4d4f; font-size: 14px; margin-bottom: 12px;">{{ authError }}</div>
      <van-button type="primary" size="small" round @click="retryAuth">重新授权</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { authApi } from '../utils/api'

const router = useRouter()
const route = useRoute()
const isDev = import.meta.env.DEV
const devPartnerId = ref('')
const authError = ref('')

// 检测是否在微信浏览器中
const isWechat = /MicroMessenger/i.test(navigator.userAgent)

// 获取微信 AppID（优先用环境变量，兜底请求后端）
const getAppId = async () => {
  const envAppId = import.meta.env.VITE_WECHAT_APP_ID
  if (envAppId) return envAppId
  try {
    const res = await authApi.getWechatConfig()
    return res.data?.appId || ''
  } catch {
    return ''
  }
}

// 构造微信 OAuth 授权 URL
const buildOAuthUrl = (appId) => {
  // redirect_uri 指向当前登录页，去掉已有的 code 和 state 参数
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  const redirectUri = encodeURIComponent(url.toString())
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=partner#wechat_redirect`
}

// 执行微信 code 登录
const doWechatLogin = async (code) => {
  try {
    const res = await authApi.wechatLogin({ code })
    localStorage.setItem('partner_token', res.data.token)
    localStorage.setItem('partner_info', JSON.stringify(res.data.partnerInfo))
    // 跳转到原始目标页或首页
    const redirect = route.query.redirect || '/home'
    router.replace(redirect)
  } catch (e) {
    authError.value = e?.response?.data?.message || '登录失败，请重试'
  }
}

// 重新发起授权
const retryAuth = async () => {
  authError.value = ''
  const appId = await getAppId()
  if (appId) {
    window.location.href = buildOAuthUrl(appId)
  } else {
    authError.value = '系统配置异常，请联系管理员'
  }
}

// 开发模式模拟登录
const devLogin = async () => {
  if (!devPartnerId.value) return showToast('请输入合伙人ID')
  try {
    const res = await authApi.wechatLogin({ code: `dev_${devPartnerId.value}` })
    localStorage.setItem('partner_token', res.data.token)
    localStorage.setItem('partner_info', JSON.stringify(res.data.partnerInfo))
    router.replace('/home')
  } catch (e) {
    showToast('登录失败，请确认合伙人ID正确')
  }
}

// 开发模式测试微信授权跳转
const testWechatAuth = async () => {
  const appId = await getAppId()
  if (!appId) return showToast('未配置 VITE_WECHAT_APP_ID')
  showToast(`将跳转到 AppID: ${appId}`)
  setTimeout(() => {
    window.location.href = buildOAuthUrl(appId)
  }, 1000)
}

// 页面加载自动处理
onMounted(async () => {
  // 已登录直接跳首页
  const existingToken = localStorage.getItem('partner_token')
  if (existingToken) {
    router.replace('/home')
    return
  }

  const code = route.query.code
  if (code) {
    // 有 code，说明是微信授权回调，直接登录
    await doWechatLogin(code)
  } else if (isWechat && !isDev) {
    // 微信环境且没有 code，自动发起静默授权
    const appId = await getAppId()
    if (appId) {
      window.location.href = buildOAuthUrl(appId)
    } else {
      authError.value = '系统配置异常，请联系管理员'
    }
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 0 24px;
}
.login-logo {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 2px;
}
.login-status {
  margin-top: 48px;
}
</style>
