<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="状态">
          <el-select v-model="query.status" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="nickname" label="报备客户昵称" />
        <el-table-column label="报备合伙人" width="120">
          <template #default="{ row }">{{ row.partner?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type" size="small">{{ statusMap[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" v-if="query.status === 'pending'">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="handleReview(row, 'approved')">通过</el-button>
            <el-button size="small" type="danger" @click="handleReview(row, 'rejected')">拒绝</el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reportApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 20, status: 'pending' })
const statusMap = { pending: { label: '待审核', type: 'warning' }, approved: { label: '已通过', type: 'success' }, rejected: { label: '已拒绝', type: 'danger' } }
const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await reportApi.getList(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

const handleReview = async (row, status) => {
  const label = status === 'approved' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${label}「${row.nickname}」的报备吗？`, '审核确认', { type: 'warning' })
    await reportApi.review(row.id, { status })
    ElMessage.success(`已${label}`)
    loadData()
  } catch (e) { /* */ }
}

onMounted(loadData)
</script>
