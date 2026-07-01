<template>
  <div>
    <div class="page-title">我的客户</div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        :immediate-check="false"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div v-for="item in list" :key="item.id" class="list-item">
          <div class="item-header">
            <span class="item-name">{{ item.nickname }}</span>
            <span class="item-badge">
              {{ item.lastMonthTransactionDate ? `${formatDate(item.lastMonthTransactionDate)}流水` : '上月无流水' }}
            </span>
          </div>
          <div class="item-body">
            <div class="item-detail">
              <div>今日流水: ¥{{ formatNum(item.todayTurnover) }}</div>
              <div>上月流水: ¥{{ formatNum(item.lastMonthTurnover) }}</div>
            </div>
            <div class="item-amount">
              ¥{{ formatNum(item.lastMonthTurnover) }}
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && list.length === 0" description="暂无客户" />
      </van-list>
    </van-pull-refresh>

    <!-- 右下角报备按钮 -->
    <div class="fab-btn" @click="$router.push('/report')">+ 报备</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { customerApi } from '../utils/api'
import dayjs from 'dayjs'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const requesting = ref(false)

const formatNum = (val) => Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatDate = (d) => d ? dayjs(d).format('MM-DD') : ''

const loadMore = async () => {
  if (requesting.value || finished.value) {
    loading.value = false
    return
  }
  requesting.value = true
  loading.value = true
  try {
    const res = await customerApi.getList({ page: page.value, pageSize: 20 })
    const items = res.data.list || []
    list.value.push(...items)
    if (list.value.length >= res.data.pagination.total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    finished.value = true
  } finally {
    requesting.value = false
    loading.value = false
  }
}

const resetAndLoad = async () => {
  if (requesting.value) return
  list.value = []
  page.value = 1
  finished.value = false
  await loadMore()
}

const onRefresh = async () => {
  await resetAndLoad()
  refreshing.value = false
}

onMounted(() => {
  resetAndLoad()
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('pageshow', resetAndLoad)
  window.addEventListener('focus', resetAndLoad)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('pageshow', resetAndLoad)
  window.removeEventListener('focus', resetAndLoad)
})

const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    resetAndLoad()
  }
}
</script>

<style scoped>
.fab-btn {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-blue);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  cursor: pointer;
  z-index: 50;
}
</style>
