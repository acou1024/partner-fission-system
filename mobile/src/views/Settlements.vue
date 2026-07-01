<template>
  <div>
    <van-nav-bar title="结算记录" left-arrow @click-left="$router.back()" />

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="item in list" :key="item.id" class="list-item">
          <div class="item-header">
            <span class="item-name">结算出款</span>
            <span style="font-size: 12px; color: var(--text-muted);">{{ formatDate(item.createdAt) }}</span>
          </div>
          <div class="item-body">
            <div class="item-detail">
              <div>{{ item.remark || '线下转账结算' }}</div>
            </div>
            <div style="font-size: 20px; font-weight: 700; color: var(--accent-green);">
              -¥{{ formatNum(item.amount) }}
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && list.length === 0" description="暂无结算记录" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { settlementApi } from '../utils/api'
import dayjs from 'dayjs'

const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

const formatNum = (val) => Number(val || 0).toFixed(2)
const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : ''

const loadMore = async () => {
  try {
    const res = await settlementApi.getList({ page: page.value, pageSize: 20 })
    const items = res.data.list || []
    list.value.push(...items)
    if (list.value.length >= res.data.pagination.total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    finished.value = true
  }
  loading.value = false
}

const onRefresh = () => {
  list.value = []
  page.value = 1
  finished.value = false
  refreshing.value = false
  loadMore()
}
</script>
