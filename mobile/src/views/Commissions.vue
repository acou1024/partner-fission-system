<template>
  <div>
    <van-nav-bar title="上月分润" left-arrow @click-left="$router.back()" />

    <!-- 筛选 -->
    <div style="display: flex; gap: 8px; padding: 12px 16px;">
      <div
        v-for="t in tabs"
        :key="t.value"
        class="filter-tab"
        :class="{ active: activeType === t.value }"
        @click="switchType(t.value)"
      >
        {{ t.label }}
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="item in list" :key="item.id" class="list-item">
          <div class="item-header">
            <span class="item-name">{{ item.transaction?.customer?.nickname || '-' }}</span>
            <span
              class="item-badge"
              :style="item.type === 'direct' ? 'background: rgba(34,197,94,0.06); color: var(--accent-green);' : 'background: rgba(59,130,246,0.06); color: var(--accent-blue);'"
            >
              {{ item.type === 'direct' ? '直推佣金' : '团队佣金' }}
            </span>
          </div>
          <div class="item-body">
            <div class="item-detail">
              <div>流水: ¥{{ formatNum(item.transaction?.amount) }}</div>
              <div>比例: {{ item.rate }}%</div>
              <div>{{ formatDate(item.transaction?.orderDate || item.createdAt) }}</div>
            </div>
            <div class="item-amount">+¥{{ formatNum(item.amount) }}</div>
          </div>
        </div>
        <van-empty v-if="!loading && list.length === 0" description="暂无上月分润" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { commissionApi } from '../utils/api'
import dayjs from 'dayjs'

const tabs = [
  { label: '全部', value: '' },
  { label: '直推佣金', value: 'direct' },
  { label: '团队佣金', value: 'team' },
]

const activeType = ref('')
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const requesting = ref(false)

const formatNum = (val) => Number(val || 0).toFixed(2)
const formatDate = (d) => d ? dayjs(d).format('MM-DD HH:mm') : ''

const switchType = (type) => {
  activeType.value = type
  onRefresh()
}

const loadMore = async () => {
  if (requesting.value || finished.value) {
    loading.value = false
    return
  }
  requesting.value = true
  try {
    const params = { page: page.value, pageSize: 20, period: 'lastMonth' }
    if (activeType.value) params.type = activeType.value
    const res = await commissionApi.getList(params)
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
    refreshing.value = false
    loading.value = false
  }
}

const onRefresh = () => {
  if (requesting.value) return
  list.value = []
  page.value = 1
  finished.value = false
  loading.value = true
  loadMore()
}

const handleVisibility = () => {
  if (document.visibilityState === 'visible') {
    onRefresh()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('pageshow', onRefresh)
  window.addEventListener('focus', onRefresh)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('pageshow', onRefresh)
  window.removeEventListener('focus', onRefresh)
})
</script>

<style scoped>
.filter-tab {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-glass);
  border: 1px solid var(--border-color);
  cursor: pointer;
}
.filter-tab.active {
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.07);
  border-color: rgba(59, 130, 246, 0.15);
}
</style>
