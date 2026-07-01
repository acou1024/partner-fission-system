<template>
  <div v-loading="loading" element-loading-text="加载中...">
    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card primary">
        <div class="stat-label">今日总流水</div>
        <div class="stat-value">¥{{ formatNum(overview.today?.turnover) }}</div>
        <div class="stat-sub">本月: ¥{{ formatNum(overview.month?.turnover) }}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">今日佣金支出</div>
        <div class="stat-value">¥{{ formatNum(overview.today?.commission) }}</div>
        <div class="stat-sub">本月: ¥{{ formatNum(overview.month?.commission) }}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">新增合伙人</div>
        <div class="stat-value">{{ overview.today?.newPartners || 0 }}</div>
        <div class="stat-sub">本月: {{ overview.month?.newPartners || 0 }} | 总计: {{ overview.total?.partners || 0 }}</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-label">新增客户</div>
        <div class="stat-value">{{ overview.today?.newCustomers || 0 }}</div>
        <div class="stat-sub">本月: {{ overview.month?.newCustomers || 0 }} | 总计: {{ overview.total?.customers || 0 }}</div>
      </div>
    </div>

    <!-- 待结算余额 -->
    <div class="stat-cards" style="grid-template-columns: 1fr;">
      <div class="stat-card" style="background: #3b82f6; color: #fff;">
        <div class="stat-label" style="color: rgba(255,255,255,0.8);">合伙人总待结算余额</div>
        <div class="stat-value" style="color: #fff;">¥{{ formatNum(overview.total?.pendingBalance) }}</div>
      </div>
    </div>

    <!-- 流水排行榜 -->
    <div class="table-card">
      <div class="page-header">
        <h2>流水排行榜</h2>
        <el-radio-group v-model="rankPeriod" size="small" @change="onPeriodChange">
          <el-radio-button value="today">今日</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
        </el-radio-group>
      </div>
      <el-table :data="ranking" stripe>
        <el-table-column type="index" label="排名" width="70" />
        <el-table-column prop="name" label="合伙人" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="客户数" width="100">
          <template #default="{ row }">{{ Number(row.customer_count) }}</template>
        </el-table-column>
        <el-table-column label="订单数" width="100">
          <template #default="{ row }">{{ Number(row.order_count) }}</template>
        </el-table-column>
        <el-table-column label="总流水">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #3b82f6;">¥{{ formatNum(row.total_turnover) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="应发佣金">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #e6a23c;">¥{{ formatNum(row.total_commission) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination 
        class="mt-16" 
        style="margin-top: 16px; justify-content: flex-end;"
        v-model:current-page="rankQuery.page" 
        v-model:page-size="rankQuery.pageSize"
        :page-sizes="[10, 20, 50]"
        :total="rankTotal" 
        layout="total, sizes, prev, pager, next, jumper" 
        @current-change="loadRanking"
        @size-change="loadRanking"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { dashboardApi } from '../utils/api'

const overview = ref({})
const ranking = ref([])
const rankPeriod = ref('month')
const rankQuery = ref({ page: 1, pageSize: 10 })
const rankTotal = ref(0)
const loading = ref(true)

const onPeriodChange = () => {
  rankQuery.value.page = 1
  loadRanking()
}

const formatNum = (val) => {
  const num = Number(val || 0)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const loadOverview = async () => {
  try {
    const res = await dashboardApi.getOverview()
    overview.value = res.data
  } catch (e) { /* */ }
  loading.value = false
}

const loadRanking = async () => {
  try {
    const res = await dashboardApi.getRanking({ 
      period: rankPeriod.value, 
      page: rankQuery.value.page, 
      pageSize: rankQuery.value.pageSize 
    })
    ranking.value = res.data?.list || res.data || []
    rankTotal.value = res.data?.pagination?.total || 0
  } catch (e) { /* */ }
}

onMounted(() => {
  loadOverview()
  loadRanking()
})
</script>
