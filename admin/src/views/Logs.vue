<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="模块">
          <el-select v-model="query.module" placeholder="全部" clearable @change="loadData">
            <el-option label="合伙人管理" value="合伙人管理" />
            <el-option label="客户管理" value="客户管理" />
            <el-option label="客户报备" value="客户报备" />
            <el-option label="流水录入" value="流水录入" />
            <el-option label="结算管理" value="结算管理" />
            <el-option label="素材管理" value="素材管理" />
            <el-option label="话术管理" value="话术管理" />
            <el-option label="域名管理" value="域名管理" />
            <el-option label="员工管理" value="员工管理" />
            <el-option label="系统配置" value="系统配置" />
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

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="操作人" width="100">
          <template #default="{ row }">{{ row.user?.realName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="110" />
        <el-table-column prop="action" label="操作" width="80" />
        <el-table-column label="详情">
          <template #default="{ row }">
            <span style="font-size: 12px; color: #6e6e73;">{{ row.detail?.substring(0, 120) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column label="时间" width="170">
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
import { systemApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const dateRange = ref(null)
const query = ref({ page: 1, pageSize: 30, module: '', startDate: '', endDate: '' })

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm:ss') : '-'

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
    const res = await systemApi.getLogs(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

onMounted(loadData)
</script>
