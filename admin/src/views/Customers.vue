<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="客户昵称" clearable @clear="loadData" />
        </el-form-item>
        <el-form-item label="归属合伙人">
          <el-select v-model="query.partnerId" placeholder="全部" clearable filterable @change="loadData">
            <el-option v-for="p in partnerOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button type="success" @click="openDialog()">新增客户</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="nickname" label="客户昵称" />
        <el-table-column label="归属合伙人" width="120">
          <template #default="{ row }">{{ row.partner?.name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="添加时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑客户' : '新增客户'" width="450px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="客户昵称" required>
          <el-input v-model="form.nickname" placeholder="请输入客户昵称" />
        </el-form-item>
        <el-form-item label="归属合伙人" required v-if="!isEdit">
          <el-select v-model="form.partnerId" placeholder="请选择" filterable>
            <el-option v-for="p in partnerOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { customerApi, partnerApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 20, keyword: '', partnerId: '' })
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ nickname: '', partnerId: null, remark: '' })
const partnerOptions = ref([])

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await customerApi.getList(query.value)
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

const openDialog = (row) => {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { nickname: row.nickname, remark: row.remark || '' }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { nickname: '', partnerId: null, remark: '' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.nickname) return ElMessage.warning('请输入客户昵称')
  if (!isEdit.value && !form.value.partnerId) return ElMessage.warning('请选择归属合伙人')
  saving.value = true
  try {
    if (isEdit.value) {
      await customerApi.update(editId.value, form.value)
    } else {
      await customerApi.create(form.value)
    }
    ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除客户「${row.nickname}」吗？`, '提示', { type: 'warning' })
    await customerApi.delete(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (e) { /* */ }
}

onMounted(() => { loadData(); loadPartners() })
</script>
