<template>
  <div class="page-container">
    <van-nav-bar title="上月流水" left-arrow @click-left="$router.back()" fixed placeholder z-index="99" />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
        class="list-container"
      >
        <div v-for="item in list" :key="item.id" class="history-item">
          <div class="item-header">
            <span class="date">{{ formatDate(item.orderDate || item.createdAt) }}</span>
            <van-tag type="primary" plain>{{ item.customer?.nickname || '未知客户' }}</van-tag>
          </div>

          <div class="item-body">
            <div class="info-line">
              <span class="label">流水金额</span>
              <span class="value">￥{{ formatNumber(item.amount) }}</span>
            </div>
            <div class="info-line" v-if="item.plan">
              <span class="label">方案</span>
              <span class="plain-value">{{ item.plan }}</span>
            </div>
            <div class="info-line" v-if="item.returnAmount !== null && item.returnAmount !== undefined">
              <span class="label">实际回流</span>
              <span class="plain-value">￥{{ formatNumber(item.returnAmount) }}</span>
            </div>
            <div class="remark" v-if="item.remark">{{ item.remark }}</div>
          </div>

          <div class="commissions-wrap" v-if="item.commissions && item.commissions.length > 0">
            <div class="commission-title">我的分润</div>
            <div v-for="commission in item.commissions" :key="commission.id" class="commission-line">
              <div class="commission-left">
                <van-tag :type="commission.type === 'direct' ? 'success' : 'warning'" size="mini" plain>
                  {{ commission.type === 'direct' ? '直推分润' : '团队分润' }}
                </van-tag>
                <span class="settled" v-if="commission.settled">已结算</span>
                <span class="unsettled" v-else>未结算</span>
              </div>
              <span class="c-val">+￥{{ formatNumber(commission.amount) }}</span>
            </div>
          </div>
        </div>
      </van-list>

      <van-empty
        v-if="list.length === 0 && !loading && !refreshing"
        description="暂无上月流水"
      />
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { transactionApi } from '../utils/api'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
const requesting = ref(false)
const pageSize = 20

const formatDate = (value) => {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
}

const formatNumber = (value) => {
  return Number(value || 0).toFixed(2)
}

const onLoad = async () => {
  if (requesting.value || finished.value) {
    loading.value = false
    return
  }
  requesting.value = true
  if (refreshing.value) {
    list.value = []
    refreshing.value = false
  }

  try {
    const res = await transactionApi.getList({ page: page.value, pageSize })
    const records = res.data.list || []
    list.value.push(...records)

    if (records.length < pageSize || list.value.length >= (res.data.pagination?.total || 0)) {
      finished.value = true
    } else {
      page.value += 1
    }
  } catch (error) {
    finished.value = true
  } finally {
    requesting.value = false
    loading.value = false
  }
}

const onRefresh = () => {
  if (requesting.value) return
  list.value = []
  finished.value = false
  loading.value = true
  page.value = 1
  onLoad()
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
.page-container {
  min-height: 100vh;
  background: #f7f8fa;
}

.list-container {
  padding: 12px;
}

.history-item {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #ebedf0;
}

.date {
  font-size: 13px;
  color: #969799;
}

.item-body {
  margin-bottom: 12px;
}

.info-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  line-height: 1.9;
}

.label {
  font-size: 14px;
  color: #646566;
}

.value {
  font-size: 18px;
  font-weight: 700;
  color: #323233;
}

.plain-value {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.remark {
  margin-top: 8px;
  font-size: 12px;
  color: #969799;
  line-height: 1.6;
}

.commissions-wrap {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
}

.commission-title {
  font-size: 12px;
  font-weight: 600;
  color: #646566;
  margin-bottom: 8px;
}

.commission-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  line-height: 1.9;
  font-size: 12px;
}

.commission-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settled {
  color: #16a34a;
}

.unsettled {
  color: #f59e0b;
}

.c-val {
  color: #ee0a24;
  font-weight: 600;
}
</style>
