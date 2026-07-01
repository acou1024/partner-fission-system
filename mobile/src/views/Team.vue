<template>
  <div>
    <van-nav-bar title="我的团队" left-arrow @click-left="$router.back()" />

    <div class="glass-card" v-if="list.length > 0">
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 12px; color: var(--text-muted);">团队人数</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--accent-blue);">{{ list.length }}</div>
      </div>
    </div>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
    <div v-for="item in list" :key="item.id" class="list-item">
      <div class="item-header">
        <span class="item-name">{{ item.name }}</span>
        <span class="item-badge">{{ item._count?.customers || 0 }}个客户</span>
      </div>
      <div class="item-body">
        <div class="item-detail">
          <div>加入时间: {{ formatDate(item.createdAt) }}</div>
        </div>
        <div class="item-amount">
          <div style="font-size: 12px; color: var(--text-muted);">当期流水</div>
          ¥{{ formatNum(item.monthTurnover) }}
        </div>
      </div>
    </div>

    <van-empty v-if="!loading && list.length === 0" description="暂无下级合伙人" />
    <van-loading v-if="loading" style="text-align: center; padding: 40px;">加载中...</van-loading>
    </van-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { teamApi } from '../utils/api'
import dayjs from 'dayjs'

const list = ref([])
const loading = ref(true)
const refreshing = ref(false)

const formatNum = (val) => Number(val || 0).toFixed(2)
const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD') : ''

const loadData = async () => {
  try {
    const res = await teamApi.getList()
    list.value = res.data || []
  } catch (e) { /* */ }
  loading.value = false
}

const onRefresh = async () => {
  await loadData()
  refreshing.value = false
}

onMounted(loadData)
</script>
