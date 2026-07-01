<template>
  <div>
    <div class="page-header">
      <h2>方案赔率管理</h2>
      <div class="header-actions">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 180px"
          @change="loadData"
        />
        <el-button @click="loadData">查询</el-button>
        <el-button type="success" @click="handleCopyPrevious">复制前一天赔率</el-button>
        <el-button type="primary" @click="openDialog()">新增方案</el-button>
      </div>
    </div>

    <el-alert
      title="赔率按天维护。客户盈利会优先使用实际回流，缺少回流时再按流水当天的方案赔率估算。"
      type="info"
      :closable="false"
      style="margin-bottom: 16px"
    />

    <el-table :data="list" stripe v-loading="loading">
      <el-table-column prop="name" label="方案名称" min-width="160" />
      <el-table-column label="生效日期" width="140">
        <template #default="{ row }">{{ formatDate(row.effectiveDate) }}</template>
      </el-table-column>
      <el-table-column label="赔率" width="120">
        <template #default="{ row }">
          <span class="odds-text">{{ Number(row.odds).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-button
            size="small"
            :type="row.status === 1 ? 'warning' : 'success'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && list.length === 0" description="当天还没有维护方案赔率" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑方案赔率' : '新增方案赔率'" width="420px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="生效日期">
          <el-date-picker
            v-model="form.effectiveDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="方案名称">
          <el-select
            v-model="form.name"
            filterable
            allow-create
            default-first-option
            clearable
            placeholder="输入或选择方案名称"
            style="width: 100%"
          >
            <el-option
              v-for="name in schemeNameOptions"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="赔率">
          <el-input-number v-model="form.odds" :min="0" :step="0.01" :precision="2" style="width: 100%" />
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
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { schemeApi } from '../utils/api'

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const schemeNameOptions = ref([])
const list = ref([])
const form = ref({
  effectiveDate: dayjs().format('YYYY-MM-DD'),
  name: '',
  odds: 1.7,
})

const formatDate = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '-')
const formatDateTime = (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-')

const loadData = async () => {
  loading.value = true
  try {
    const res = await schemeApi.getList({ date: selectedDate.value })
    list.value = res.data?.list || []
    schemeNameOptions.value = res.data?.schemeNames || []
  } catch (e) {
    ElMessage.error(e.message || '获取方案赔率失败')
  } finally {
    loading.value = false
  }
}

const openDialog = (row) => {
  if (row) {
    editingId.value = row.id
    form.value = {
      effectiveDate: formatDate(row.effectiveDate),
      name: row.name,
      odds: Number(row.odds),
    }
  } else {
    editingId.value = null
    form.value = {
      effectiveDate: selectedDate.value,
      name: '',
      odds: 1.7,
    }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.effectiveDate) return ElMessage.warning('请选择生效日期')
  if (!form.value.name) return ElMessage.warning('请输入方案名称')
  saving.value = true
  try {
    if (editingId.value) {
      await schemeApi.update(editingId.value, form.value)
    } else {
      await schemeApi.create(form.value)
    }
    selectedDate.value = form.value.effectiveDate
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    await schemeApi.update(row.id, { status: row.status === 1 ? 0 : 1 })
    ElMessage.success(row.status === 1 ? '已停用' : '已启用')
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '更新状态失败')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.name} 在 ${formatDate(row.effectiveDate)} 的赔率配置吗？`, '提示', {
      type: 'warning',
    })
    await schemeApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

const handleCopyPrevious = async () => {
  try {
    await ElMessageBox.confirm(`确定把前一天的赔率复制到 ${selectedDate.value} 吗？`, '复制确认', {
      type: 'warning',
    })
    const res = await schemeApi.copy({ targetDate: selectedDate.value })
    ElMessage.success(res.message || '复制成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '复制失败')
    }
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.odds-text {
  font-weight: 600;
  color: #e6a23c;
}
</style>
