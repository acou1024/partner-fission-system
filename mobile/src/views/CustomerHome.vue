<template>
  <div>
    <!-- 顶部标题 -->
    <div class="page-title" style="display: flex; justify-content: space-between; align-items: center;">
      <span>我的数据</span>
      <span style="font-size: 13px; color: var(--text-muted); cursor: pointer;" @click="handleLogout">退出</span>
    </div>

    <!-- 今日数据大屏 -->
    <div class="asset-panel">
      <div class="asset-label">今日流水</div>
      <div class="asset-value">¥{{ formatNum(stats.todayTurnover) }}<span class="unit">元</span></div>
      <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
        今日 {{ stats.todayOrders || 0 }} 笔订单
      </div>
      <div class="asset-row">
        <div class="asset-item">
          <div class="sub-label">当期流水</div>
          <div class="sub-value">¥{{ formatNum(stats.monthTurnover) }}</div>
        </div>
        <div class="asset-item">
          <div class="sub-label">当期订单</div>
          <div class="sub-value">{{ stats.monthOrders || 0 }}笔</div>
        </div>
        <div class="asset-item">
          <div class="sub-label">累计流水</div>
          <div class="sub-value">¥{{ formatNum(stats.totalTurnover) }}</div>
        </div>
      </div>
    </div>

    <!-- 实时动态提示 -->
    <div class="glass-card" style="text-align: center;">
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
        数据由系统实时同步，如有疑问请联系您的专属顾问
      </div>
      <van-button size="small" plain round type="primary" @click="refreshData" :loading="loading">
        刷新数据
      </van-button>
    </div>

    <!-- 流水明细 -->
    <div class="section-title">
      <span>流水明细</span>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="listLoading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="item in transactions" :key="item.id" class="list-item">
          <div class="item-header">
            <span class="item-name">流水记录</span>
            <span style="font-size: 12px; color: var(--text-muted);">
              {{ item.orderDate?.substring(0, 10) }}
            </span>
          </div>
          <div class="item-body">
            <div class="item-detail">
              <div v-if="item.remark">{{ item.remark }}</div>
              <div style="font-size: 11px; color: var(--text-muted);">
                录入时间: {{ formatDate(item.createdAt) }}
              </div>
            </div>
            <div class="item-amount">
              ¥{{ formatNum(item.amount) }}
            </div>
          </div>
        </div>
        <van-empty v-if="!listLoading && transactions.length === 0" description="暂无流水记录" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { inviteApi } from '../utils/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const listLoading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const stats = ref({})
const transactions = ref([])
const page = ref(1)

const formatNum = (val) => Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (d) => d ? dayjs(d).format('MM-DD HH:mm') : ''

const loadDashboard = async () => {
  loading.value = true
  try {
    const res = await inviteApi.getDashboard()
    stats.value = res.data.stats || {}
  } catch (e) {
    // 如果 token 失效，跳转登录
    if (e.response?.status === 401) {
      localStorage.removeItem('customer_token')
      router.replace('/login')
    }
  }
  loading.value = false
}

const loadMore = async () => {
  try {
    const res = await inviteApi.getTransactions({ page: page.value, pageSize: 20 })
    const items = res.data.list || []
    transactions.value.push(...items)
    if (transactions.value.length >= res.data.pagination.total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    finished.value = true
  }
  listLoading.value = false
}

const onRefresh = () => {
  transactions.value = []
  page.value = 1
  finished.value = false
  refreshing.value = false
  loadDashboard()
  loadMore()
}

const refreshData = () => {
  onRefresh()
}

const handleLogout = async () => {
  try {
    await showDialog({ title: '确认退出', message: '退出后需要重新通过邀请链接进入', showCancelButton: true })
    localStorage.removeItem('customer_token')
    localStorage.removeItem('customer_info')
    router.replace('/login')
  } catch (e) { /* cancel */ }
}

onMounted(loadDashboard)
</script>
