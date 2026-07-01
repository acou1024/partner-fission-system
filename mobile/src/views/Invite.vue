<template>
  <div class="login-page">
    <div class="login-logo">合伙人中心</div>
    <div class="login-desc">欢迎加入，请授权微信绑定您的账号</div>

    <div class="glass-card" style="margin-top: 40px; width: 100%;">
      <div style="text-align: center; color: var(--accent-blue); font-size: 16px; margin-bottom: 20px;">
        账号绑定
      </div>
      <van-button type="primary" block round size="large" :loading="loading" @click="handleBind">
        微信授权绑定
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { authApi } from '../utils/api'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const inviteCode = route.params.code

const handleBind = async () => {
  const code = route.query.code
  if (!code) {
    // 跳转微信授权
    const appId = import.meta.env.VITE_WECHAT_APP_ID || ''
    const redirectUri = encodeURIComponent(window.location.href)
    window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base#wechat_redirect`
    return
  }

  loading.value = true
  try {
    const res = await authApi.wechatBind({ code, inviteCode })
    localStorage.setItem('partner_token', res.data.token)
    localStorage.setItem('partner_info', JSON.stringify(res.data.partnerInfo))
    showToast({ message: '绑定成功！', position: 'bottom' })
    setTimeout(() => router.replace('/home'), 1000)
  } catch (e) { /* handled */ }
  loading.value = false
}

// 如果已有code，自动绑定
if (route.query.code) {
  handleBind()
}
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
}
.login-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 12px;
}
</style>
