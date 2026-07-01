<template>
  <div class="join-page">
    <!-- 加载中 -->
    <div v-if="status === 'loading'" class="join-center">
      <van-loading size="40px" color="var(--accent-blue)">验证邀请码...</van-loading>
    </div>

    <!-- 邀请码无效 -->
    <div v-else-if="status === 'invalid'" class="join-center">
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <div style="font-size: 18px; font-weight: 600; color: #ef4444;">邀请码无效</div>
      <div style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">{{ errorMsg }}</div>
    </div>

    <!-- 邀请码有效，展示欢迎页 -->
    <div v-else-if="status === 'ready'" class="join-center">
      <div class="join-logo">🎉</div>
      <div class="join-title">欢迎加入</div>
      <div class="join-desc">您的专属顾问 <b style="color: var(--accent-blue);">{{ partnerName }}</b> 邀请您</div>

      <div class="glass-card" style="width: 100%; margin-top: 32px;">
        <van-button type="primary" block round size="large" :loading="registering" @click="handleJoin">
          微信授权加入
        </van-button>
        <div style="font-size: 12px; color: var(--text-muted); text-align: center; margin-top: 12px;">
          授权后将自动绑定，查看您的专属数据
        </div>
      </div>
    </div>

    <!-- 注册成功 -->
    <div v-else-if="status === 'success'" class="join-center">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <div style="font-size: 20px; font-weight: 700; color: var(--accent-green);">
        {{ isNew ? '加入成功！' : '欢迎回来！' }}
      </div>
      <div style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">
        {{ isNew ? '已自动绑定到您的专属顾问名下' : '已自动识别您的账号' }}
      </div>
      <van-button type="primary" block round size="large" style="margin-top: 32px;" @click="goToDashboard">
        查看我的数据
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { inviteApi } from '../utils/api'

const router = useRouter()
const route = useRoute()
const inviteCode = route.params.code

const status = ref('loading')  // loading | invalid | ready | success
const errorMsg = ref('')
const partnerName = ref('')
const registering = ref(false)
const isNew = ref(false)

// 1. 验证邀请码
onMounted(async () => {
  try {
    const res = await inviteApi.validate(inviteCode)
    if (res.data.valid) {
      partnerName.value = res.data.partnerName
      status.value = 'ready'

      // 如果URL中已有微信回调code，自动注册
      if (route.query.code) {
        await doRegister(route.query.code)
      }
    } else {
      status.value = 'invalid'
      errorMsg.value = '邀请码不存在或已失效'
    }
  } catch (e) {
    status.value = 'invalid'
    errorMsg.value = e.message || '验证失败'
  }
})

// 2. 点击授权加入
const handleJoin = () => {
  const wechatCode = route.query.code
  if (wechatCode) {
    doRegister(wechatCode)
  } else {
    // 跳转微信授权
    const appId = import.meta.env.VITE_WECHAT_APP_ID || ''
    const redirectUri = encodeURIComponent(window.location.href.split('?')[0])
    window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base#wechat_redirect`
  }
}

// 3. 执行注册/登录
const doRegister = async (wechatCode) => {
  registering.value = true
  try {
    const res = await inviteApi.register({
      code: wechatCode,
      inviteCode,
      nickname: null,  // 可以后续让用户填，也可以自动生成
    })

    // 保存token
    localStorage.setItem('customer_token', res.data.token)
    localStorage.setItem('customer_info', JSON.stringify(res.data.info))
    isNew.value = !!res.data.isNew

    // 如果返回的是合伙人身份，跳转合伙人端
    if (res.data.userType === 'partner') {
      localStorage.setItem('partner_token', res.data.token)
      localStorage.setItem('partner_info', JSON.stringify(res.data.info))
      showToast({ message: '您已是合伙人，跳转中...', position: 'bottom' })
      setTimeout(() => router.replace('/home'), 1000)
      return
    }

    status.value = 'success'
  } catch (e) {
    showToast({ message: e.message || '注册失败', position: 'bottom' })
    registering.value = false
  }
}

// 4. 跳转客户看板
const goToDashboard = () => {
  router.replace('/c/home')
}
</script>

<style scoped>
.join-page {
  min-height: 100vh;
  background: var(--bg-primary);
  padding: 0 24px;
}
.join-center {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.join-logo {
  font-size: 64px;
  margin-bottom: 16px;
}
.join-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
}
.join-desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: 8px;
}
</style>
