<template>
  <div>
    <div class="search-bar">
      <el-button type="success" @click="openDialog()">新增员工</el-button>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" width="130" />
        <el-table-column prop="realName" label="姓名" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ row.role === 'admin' ? '管理员' : '员工' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" :disabled="row.role === 'admin'">禁用</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑员工' : '新增员工'" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名" required v-if="!isEdit">
          <el-input v-model="form.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="密码" required v-if="!isEdit">
          <el-input v-model="form.password" type="password" placeholder="登录密码" show-password />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.realName" placeholder="真实姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="手机号" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="员工" value="staff" />
            <el-option label="管理员" value="admin" />
          </el-select>
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
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 20 })
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ username: '', password: '', realName: '', phone: '', role: 'staff' })

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await systemApi.getStaffList(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

const openDialog = (row) => {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    form.value = { realName: row.realName, phone: row.phone || '', role: row.role }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { username: '', password: '', realName: '', phone: '', role: 'staff' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.realName) return ElMessage.warning('请输入姓名')
  if (!isEdit.value && (!form.value.username || !form.value.password)) return ElMessage.warning('请输入用户名和密码')
  saving.value = true
  try {
    if (isEdit.value) {
      await systemApi.updateStaff(editId.value, form.value)
    } else {
      await systemApi.createStaff(form.value)
    }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const resetPassword = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt(`为「${row.realName}」设置新密码`, '重置密码', {
      inputPattern: /^.{6,}$/,
      inputErrorMessage: '密码不能少于6位',
    })
    await systemApi.updateStaff(row.id, { password: value })
    ElMessage.success('密码已重置')
  } catch (e) { /* */ }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定禁用员工「${row.realName}」吗？`, '提示', { type: 'warning' })
    await systemApi.deleteStaff(row.id)
    ElMessage.success('已禁用')
    loadData()
  } catch (e) { /* */ }
}

onMounted(loadData)
</script>
