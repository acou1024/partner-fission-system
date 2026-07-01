<template>
  <div>
    <div class="search-bar">
      <el-button type="success" @click="openDialog">新增域名</el-button>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="domain" label="域名地址" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.type === 'entry' ? 'primary' : 'success'" size="small">
              {{ row.type === 'entry' ? '入口域名' : '落地域名' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive === 1 ? 'success' : 'info'" size="small">
              {{ row.isActive === 1 ? '当前使用' : '备用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleSwitch(row)" :disabled="row.isActive === 1">切换启用</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" :disabled="row.isActive === 1">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" title="新增域名" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="域名" required>
          <el-input v-model="form.domain" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="form.type">
            <el-option label="入口域名" value="entry" />
            <el-option label="落地域名" value="landing" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="备注信息" />
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
import { systemApi } from '../utils/api'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const dialogVisible = ref(false)
const form = ref({ domain: '', type: 'landing', remark: '' })

const loadData = async () => {
  loading.value = true
  try {
    const res = await systemApi.getDomains()
    list.value = res.data || []
  } catch (e) { /* */ }
  loading.value = false
}

const openDialog = () => {
  form.value = { domain: '', type: 'landing', remark: '' }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.domain) return ElMessage.warning('请输入域名')
  saving.value = true
  try {
    await systemApi.addDomain(form.value)
    ElMessage.success('域名添加成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const handleSwitch = async (row) => {
  try {
    await ElMessageBox.confirm(`确定将${row.type === 'entry' ? '入口' : '落地'}域名切换为「${row.domain}」吗？`, '切换确认', { type: 'warning' })
    await systemApi.switchDomain(row.id)
    ElMessage.success('域名已切换')
    loadData()
  } catch (e) { /* */ }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除域名「${row.domain}」吗？`, '提示', { type: 'warning' })
    await systemApi.deleteDomain(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (e) { /* */ }
}

onMounted(loadData)
</script>
