<template>
  <div>
    <div class="page-title">我的</div>

    <!-- 个人信息卡片 -->
    <div class="asset-panel">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(59,130,246,0.08); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--accent-blue);">
          {{ partnerInfo.name?.charAt(0) || '合' }}
        </div>
        <div>
          <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">{{ partnerInfo.name || '合伙人' }}</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            累计收益: ¥{{ formatNum(partnerInfo.totalEarnings) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="glass-card" style="padding: 0;">
      <div class="menu-item" @click="$router.push('/commissions')">
        <span class="menu-label"><svg class="menu-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 11h20"/></svg>上月分润</span>
        <span style="color: var(--text-muted);">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/settlements')">
        <span class="menu-label"><svg class="menu-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>结算记录</span>
        <span style="color: var(--text-muted);">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/team')">
        <span class="menu-label"><svg class="menu-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>我的团队</span>
        <span style="color: var(--text-muted);">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/scripts')">
        <span class="menu-label"><svg class="menu-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>话术库</span>
        <span style="color: var(--text-muted);">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/projection')">
        <span class="menu-label"><svg class="menu-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>收益推演工具</span>
        <span style="color: var(--text-muted);">›</span>
      </div>
    </div>

    <div class="glass-card" style="padding: 0;">
      <div class="menu-item" style="color: var(--accent-red);" @click="handleLogout">
        <span>退出登录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'

const router = useRouter()
const partnerInfo = ref(JSON.parse(localStorage.getItem('partner_info') || '{}'))

const formatNum = (val) => Number(val || 0).toFixed(2)

const handleLogout = async () => {
  try {
    await showDialog({ title: '确认退出', message: '确定退出登录吗？', showCancelButton: true })
    localStorage.removeItem('partner_token')
    localStorage.removeItem('partner_info')
    router.replace('/login')
  } catch (e) { /* 取消 */ }
}
</script>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 15px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:active {
  background: rgba(0, 0, 0, 0.03);
}
.menu-label {
  display: flex;
  align-items: center;
  gap: 10px;
}
.menu-svg {
  color: var(--text-muted);
  flex-shrink: 0;
}
</style>
