<template>
  <div>
    <div class="page-header">
      <h2>客户盈利</h2>
    </div>

    <div class="filter-bar">
      <el-select
        v-model="query.partnerId"
        placeholder="选择合伙人"
        clearable
        style="width: 180px"
        @change="loadData"
      >
        <el-option
          v-for="partner in partners"
          :key="partner.id"
          :label="partner.name"
          :value="partner.id"
        />
      </el-select>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 280px"
        @change="onDateChange"
      />

      <el-button type="primary" @click="loadData">查询</el-button>
    </div>

    <el-alert
      v-if="missingSchemeWarning"
      :title="missingSchemeWarning"
      type="error"
      :closable="false"
      style="margin-bottom: 16px"
    />

    <div class="summary-cards">
      <div class="summary-card blue">
        <div class="label">总投注</div>
        <div class="value">￥{{ formatNum(summary.totalBet) }}</div>
      </div>
      <div class="summary-card green">
        <div class="label">总回流</div>
        <div class="value">￥{{ formatNum(summary.totalReturn) }}</div>
      </div>
      <div class="summary-card" :class="summary.totalProfit >= 0 ? 'red' : 'purple'">
        <div class="label">总盈亏</div>
        <div class="value">{{ summary.totalProfit >= 0 ? '+' : '' }}￥{{ formatNum(summary.totalProfit) }}</div>
      </div>
    </div>

    <el-alert
      title="客户盈利优先使用实际回流；没有实际回流时，系统会按流水当天的方案赔率估算。"
      type="info"
      :closable="false"
      style="margin-bottom: 16px"
    />

    <el-table :data="list" stripe v-loading="loading" @sort-change="onSortChange">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="nickname" label="客户昵称" min-width="140" />
      <el-table-column prop="partnerName" label="所属合伙人" min-width="120" />
      <el-table-column prop="betCount" label="投注笔数" width="100" sortable="custom" />
      <el-table-column prop="totalBet" label="总投注" width="140" sortable="custom" align="right">
        <template #default="{ row }">￥{{ formatNum(row.totalBet) }}</template>
      </el-table-column>
      <el-table-column prop="totalReturn" label="总回流" width="140" sortable="custom" align="right">
        <template #default="{ row }">
          <span class="green-text">￥{{ formatNum(row.totalReturn) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="totalProfit" label="盈亏" width="140" sortable="custom" align="right">
        <template #default="{ row }">
          <span :class="row.totalProfit >= 0 ? 'red-text' : 'blue-text'">
            {{ row.totalProfit >= 0 ? '+' : '' }}￥{{ formatNum(row.totalProfit) }}
          </span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="mt-16"
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="loadData"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { customerProfitApi, partnerApi } from '../utils/api'

const loading = ref(false)
const list = ref([])
const partners = ref([])
const total = ref(0)
const dateRange = ref(null)
const missingSchemeWarning = ref('')
const missingSchemeDialogShown = ref('')

const summary = reactive({
  totalBet: 0,
  totalReturn: 0,
  totalProfit: 0,
})

const query = ref({
  partnerId: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 20,
})

const formatNum = (value) => {
  return Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const resetTableData = () => {
  list.value = []
  total.value = 0
  summary.totalBet = 0
  summary.totalReturn = 0
  summary.totalProfit = 0
}

const extractMissingSchemeWarning = (message) => {
  if (!message || !message.includes('方案赔率')) {
    return ''
  }
  return message
}

const showMissingSchemeDialog = async (message) => {
  if (!message || missingSchemeDialogShown.value === message) {
    return
  }

  missingSchemeDialogShown.value = message

  await ElMessageBox.alert(
    '当前查询范围内存在未配置的方案赔率，请先前往“方案赔率”页面补齐对应日期后，再重新查询客户盈利。',
    '方案赔率未配置',
    {
      confirmButtonText: '我知道了',
      type: 'warning',
    }
  ).catch(() => {})
}

const onDateChange = (value) => {
  if (value) {
    query.value.startDate = value[0]
    query.value.endDate = value[1]
  } else {
    query.value.startDate = ''
    query.value.endDate = ''
  }
  query.value.page = 1
  loadData()
}

const onSortChange = ({ prop, order }) => {
  if (!order) {
    loadData()
    return
  }
  const direction = order === 'ascending' ? 1 : -1
  list.value.sort((a, b) => (a[prop] - b[prop]) * direction)
}

const loadData = async () => {
  loading.value = true
  try {
    missingSchemeWarning.value = ''
    const res = await customerProfitApi.getList(query.value, { skipErrorMessage: true })
    list.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
    summary.totalBet = res.data?.summary?.totalBet || 0
    summary.totalReturn = res.data?.summary?.totalReturn || 0
    summary.totalProfit = res.data?.summary?.totalProfit || 0
  } catch (error) {
    const message = error.response?.data?.message || error.message || '获取客户盈利汇总失败'
    const schemeWarning = extractMissingSchemeWarning(message)

    resetTableData()

    if (schemeWarning) {
      missingSchemeWarning.value = schemeWarning
      await showMissingSchemeDialog(schemeWarning)
    } else {
      ElMessage.error(message)
    }
  } finally {
    loading.value = false
  }
}

const loadPartners = async () => {
  try {
    const res = await partnerApi.getList({ pageSize: 999 })
    partners.value = res.data?.list || []
  } catch (error) {
    ElMessage.error(error.response?.data?.message || error.message || '获取合伙人列表失败')
  }
}

onMounted(() => {
  loadPartners()
  loadData()
})
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  padding: 16px;
  border-radius: 8px;
  color: #fff;
}

.summary-card .label {
  font-size: 13px;
  opacity: 0.8;
}

.summary-card .value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
}

.blue {
  background: #3b82f6;
}

.green {
  background: #10b981;
}

.red {
  background: #ef4444;
}

.purple {
  background: #6366f1;
}

.green-text {
  color: #10b981;
  font-weight: 600;
}

.red-text {
  color: #ef4444;
  font-weight: 600;
}

.blue-text {
  color: #3b82f6;
  font-weight: 600;
}
</style>
