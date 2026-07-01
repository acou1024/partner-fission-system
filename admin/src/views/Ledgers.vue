<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="合伙人">
          <el-select v-model="query.partnerId" placeholder="全部" clearable filterable @change="loadData">
            <el-option v-for="p in partnerOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker v-model="dateRange" type="daterange" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" @change="onDateChange" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 顶栏统计：简单加总当前页搜索结果的数据（或者你可以调用专门的 stats 接口，这里使用表格数据展示个大概，或者省略） -->

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="归属合伙人" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.partner?.name || '-' }}
            <div style="font-size: 12px; color: #999;">{{ row.partner?.staff?.realName ? `(员工: ${row.partner.staff.realName})` : '' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="记账日期" width="120">
          <template #default="{ row }">{{ row.recordDate?.substring(0, 10) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="名目/标题" width="150" show-overflow-tooltip />
        <el-table-column label="投入资金" width="120">
          <template #default="{ row }">
            <span style="color: #606266;">¥{{ Number(row.investAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="回流资金" width="120">
          <template #default="{ row }">
            <span style="color: #3b82f6;">¥{{ Number(row.returnAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="利润结余" width="130">
          <template #default="{ row }">
            <span :style="{ fontWeight: 600, color: row.profitAmount >= 0 ? '#10b981' : '#f56c6c' }">
              {{ row.profitAmount > 0 ? '+' : '' }}¥{{ Number(row.profitAmount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ledgerApi, partnerApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dateRange = ref(null)
const query = ref({ page: 1, pageSize: 20, partnerId: '', startDate: '', endDate: '' })
const partnerOptions = ref([])

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'

const onDateChange = (val) => {
  if (val) {
    query.value.startDate = val[0]
    query.value.endDate = val[1]
  } else {
    query.value.startDate = ''
    query.value.endDate = ''
  }
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await ledgerApi.getList(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

const loadPartners = async () => {
  try {
    const res = await partnerApi.getList({ pageSize: 500, status: 1 })
    partnerOptions.value = res.data.list || []
  } catch (e) { /* */ }
}

onMounted(() => {
  loadPartners()
  loadData()
})
</script>

<style scoped>
.search-bar {
  background: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.table-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.mt-16 {
  margin-top: 16px;
}
</style>
