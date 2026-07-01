<template>
  <div>
    <van-nav-bar title="报备客户" left-arrow @click-left="$router.back()" />

    <div class="glass-card">
      <van-form @submit="handleSubmit">
        <van-cell-group inset :border="false" style="background: transparent;">
          <van-field
            v-model="form.nickname"
            label="客户昵称"
            placeholder="请输入客户昵称或群名"
            :rules="[{ required: true, message: '请输入客户昵称' }]"
          />
          <van-field
            v-model="form.remark"
            label="备注"
            type="textarea"
            rows="2"
            placeholder="补充说明（选填）"
          />
        </van-cell-group>
        <div style="padding: 16px;">
          <van-button type="primary" block round native-type="submit" :loading="loading">
            提交报备
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 我的报备记录 -->
    <div class="section-title">报备记录</div>
    <div v-for="item in records" :key="item.id" class="list-item">
      <div class="item-header">
        <span class="item-name">{{ item.nickname }}</span>
        <span class="item-badge" :style="badgeStyle(item.status)">{{ statusLabel(item.status) }}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
        {{ formatDate(item.createdAt) }}
      </div>
    </div>
    <van-empty v-if="records.length === 0" description="暂无报备记录" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { reportApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const form = ref({ nickname: '', remark: '' })
const records = ref([])

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : ''

const statusLabel = (s) => ({ pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s)
const badgeStyle = (s) => {
  const colors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }
  return { background: `${colors[s]}12`, color: colors[s] }
}

const handleSubmit = async () => {
  loading.value = true
  try {
    await reportApi.submit(form.value)
    showToast({ message: '报备成功，等待审核', position: 'bottom' })
    form.value = { nickname: '', remark: '' }
    loadRecords()
  } catch (e) { /* */ }
  loading.value = false
}

const loadRecords = async () => {
  try {
    const res = await reportApi.getList({ pageSize: 50 })
    records.value = res.data.list || []
  } catch (e) { /* */ }
}

onMounted(loadRecords)
</script>
