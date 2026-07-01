<template>
  <div>
    <div class="page-title">工作台</div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <div v-if="loading" style="padding: 16px">
        <div class="skeleton-card" style="height: 160px; margin-bottom: 12px"></div>
        <div style="display: flex; gap: 10px; margin-bottom: 12px">
          <div class="skeleton-card" style="flex: 1; height: 70px"></div>
          <div class="skeleton-card" style="flex: 1; height: 70px"></div>
          <div class="skeleton-card" style="flex: 1; height: 70px"></div>
        </div>
        <div class="skeleton-card" style="height: 100px"></div>
      </div>

      <div v-else class="asset-panel">
        <div class="asset-label">本月收益</div>
        <div class="asset-value">
          ￥{{ formatNum(data.stats?.monthCommission) }}
          <span class="unit">元</span>
        </div>
        <div class="asset-row">
          <div class="asset-item">
            <div class="sub-label">上月流水</div>
            <div class="sub-value">￥{{ formatCompact(data.stats?.archivedTurnover) }}</div>
          </div>
          <div class="asset-item">
            <div class="sub-label">上月分润</div>
            <div class="sub-value">￥{{ formatCompact(data.stats?.archivedCommission) }}</div>
          </div>
          <div class="asset-item">
            <div class="sub-label">累计流水</div>
            <div class="sub-value">￥{{ formatCompact(data.stats?.totalDirectTurnover) }}</div>
          </div>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-val gold">￥{{ formatNum(data.stats?.todayTurnover) }}</div>
          <div class="stat-lbl">今日流水</div>
        </div>
        <div class="stat-card">
          <div class="stat-val blue">{{ data.stats?.todayNewCustomers || 0 }}</div>
          <div class="stat-lbl">今日新增客户数</div>
        </div>
        <div class="stat-card clickable" @click="$router.push('/report')">
          <div class="stat-val orange">+</div>
          <div class="stat-lbl">新客报备</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ data.stats?.totalCustomers || 0 }}</div>
          <div class="stat-lbl">总客户数</div>
        </div>
      </div>

      <div class="glass-card earning-tip" v-if="Number(data.stats?.todayTurnover) > 0">
        <div class="earning-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <div class="earning-val">今日分润 ￥{{ formatNum(data.stats?.todayCommission) }}</div>
          <div class="earning-sub">来自 {{ data.stats?.totalCustomers || 0 }} 个客户的当期流水</div>
        </div>
      </div>

      <div class="section-title">快捷操作</div>
      <div class="quick-grid">
        <div class="quick-btn" @click="$router.push('/ledger')">
          <span class="quick-icon icon-invite">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          <span>记账本</span>
        </div>
        <div class="quick-btn" @click="$router.push('/transactions')">
          <span class="quick-icon history-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>
          <span>上月流水</span>
        </div>
        <div class="quick-btn" @click="$router.push('/commissions')">
          <span class="quick-icon icon-commission">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 3v4M8 3v4M2 11h20"/>
              <path d="M12 15v2"/>
            </svg>
          </span>
          <span>上月分润</span>
        </div>
        <div class="quick-btn" @click="$router.push('/team')">
          <span class="quick-icon icon-team">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span>我的团队</span>
        </div>
        <div class="quick-btn" @click="$router.push('/projection')">
          <span class="quick-icon icon-calc">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </span>
          <span>倍投精算</span>
        </div>
        <div class="quick-btn" @click="$router.push('/qa')">
          <span class="quick-icon icon-qa">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <span>反诈应对</span>
        </div>
        <div class="quick-btn" @click="$router.push('/risk-words')">
          <span class="quick-icon icon-risk">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <span>风控字典</span>
        </div>
      </div>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { workbenchApi } from '../utils/api'

const data = ref({ partner: {}, stats: {} })
const loading = ref(true)
const refreshing = ref(false)

const formatNum = (value) => {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// 大数缩写：>=1亿→X.X亿，>=1万→X.X万，其余正常显示
const formatCompact = (value) => {
  const n = Number(value || 0)
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const loadData = async () => {
  try {
    const res = await workbenchApi.getData()
    data.value = res.data
  } finally {
    loading.value = false
  }
}

const onRefresh = async () => {
  await loadData()
  refreshing.value = false
}

// 页面重新可见时自动刷新（解决数据导入后不同步问题）
const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    loadData()
  }
}

onMounted(() => {
  loadData()
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('pageshow', loadData)
  window.addEventListener('focus', loadData)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('pageshow', loadData)
  window.removeEventListener('focus', loadData)
})
</script>

<style scoped>
.stat-row {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin-bottom: 4px;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:active {
  opacity: 0.75;
}

.stat-val.orange {
  color: var(--accent-orange);
  font-size: 22px;
}

.stat-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 14px;
  box-shadow: var(--shadow-card);
  text-align: center;
}

.stat-val {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.stat-val.gold {
  color: var(--accent-blue);
}

.stat-val.blue {
  color: var(--accent-blue);
}

.stat-lbl {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  font-weight: 500;
}

.earning-tip {
  display: flex;
  align-items: center;
  gap: 12px;
  border-left: 3px solid var(--accent-blue);
}

.earning-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.07);
  color: var(--accent-green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.earning-val {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-green);
}

.earning-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 0 16px;
  margin-bottom: 8px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 12px;
  transition: background 0.15s;
}

.quick-btn:active {
  background: rgba(0, 0, 0, 0.03);
}

.quick-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-invite {
  background: rgba(59, 130, 246, 0.07);
  color: var(--accent-blue);
}

.history-icon {
  background: rgba(16, 185, 129, 0.07);
  color: #10b981;
}

.icon-commission {
  background: rgba(249, 158, 11, 0.07);
  color: var(--accent-orange);
}

.icon-team {
  background: rgba(34, 197, 94, 0.07);
  color: var(--accent-green);
}

.icon-calc {
  background: rgba(139, 92, 246, 0.07);
  color: var(--accent-purple);
}

.icon-qa {
  background: rgba(59, 130, 246, 0.07);
  color: var(--accent-blue);
}

.icon-risk {
  background: rgba(239, 68, 68, 0.07);
  color: var(--accent-red);
}
</style>
