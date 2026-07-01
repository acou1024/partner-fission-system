<template>
  <div class="page-container">
    <el-card class="filter-card" shadow="never">
      <div class="header-wrap">
        <h2>月度结算汇总</h2>
        <div class="filter-actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 300px"
            @change="fetchData"
          />
          <el-button type="primary" @click="fetchData">查询</el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" class="stat-row">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">总计收流水(元)</div>
            <div class="stat-value flow">¥{{ formatMoney(summary.totalFlow) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">总计店铺盈利(元)</div>
            <div class="stat-value profit">¥{{ formatMoney(summary.totalStoreProfit) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">应发总佣金(元)</div>
            <div class="stat-value comm">¥{{ formatMoney(summary.totalCommission) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-table :data="pagedTableData" v-loading="loading" border stripe>
        <el-table-column prop="partnerName" label="合伙人名称" min-width="140" />
        <el-table-column prop="partnerPhone" label="手机号" width="140" />
        <el-table-column prop="txCount" label="包含流水笔数" width="120" align="center" />
        <el-table-column prop="totalFlow" label="期间总流水" align="right" min-width="140">
          <template #default="{ row }">
            <span class="flow-text">¥{{ formatMoney(row.totalFlow) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalStoreProfit" label="店铺盈利" align="right" min-width="140">
          <template #default="{ row }">
            <span class="profit-text">¥{{ formatMoney(row.totalStoreProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalCommission" label="期间应发佣金" align="right" min-width="140">
          <template #default="{ row }">
            <span class="comm-text">¥{{ formatMoney(row.totalCommission) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="table-pagination"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="tableData.length"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { settlementApi } from '../utils/api'

const loading = ref(false)
const dateRange = ref([])
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(20)

const summary = reactive({
  totalFlow: 0,
  totalStoreProfit: 0,
  totalCommission: 0,
})

const formatMoney = (value) => Number(value || 0).toFixed(2)

const pagedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return tableData.value.slice(start, start + pageSize.value)
})

const initDateRange = () => {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  const pad = (value) => String(value).padStart(2, '0')
  dateRange.value = [
    `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  ]
}

const fetchData = async () => {
  loading.value = true
  currentPage.value = 1
  try {
    const [startDate, endDate] = dateRange.value || []
    const res = await settlementApi.getMonthlyStats({ startDate, endDate })
    summary.totalFlow = res.data?.summary?.totalFlow || 0
    summary.totalStoreProfit = res.data?.summary?.totalStoreProfit || 0
    summary.totalCommission = res.data?.summary?.totalCommission || 0
    tableData.value = res.data?.list || []
  } catch (e) {
    ElMessage.error(e.message || '获取月度结算汇总失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initDateRange()
  fetchData()
})
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-wrap h2 {
  margin: 0;
  font-size: 18px;
  color: #1d1d1f;
  font-weight: 500;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 10px 0;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
}

.stat-value.flow {
  color: #3b82f6;
}

.stat-value.profit {
  color: #f59e0b;
}

.stat-value.comm {
  color: #10b981;
}

.flow-text {
  font-weight: 600;
  color: #1d1d1f;
}

.profit-text {
  font-weight: 600;
  color: #f59e0b;
}

.comm-text {
  font-weight: 600;
  color: #10b981;
}

.table-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
