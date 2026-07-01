<template>
  <div>
    <div class="search-bar">
      <el-button type="danger" @click="openDialog()">新增风控词</el-button>
    </div>

    <div class="table-card">
      <el-alert type="error" :closable="false" style="margin-bottom: 16px;">
        <template #title>
          <strong>⚠️ 微信查得很严，必须按下方替换词聊天，违者罚款！</strong>
        </template>
      </el-alert>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="badWord" label="❌ 违规词 (严禁出现)" min-width="200">
          <template #default="{ row }">
            <span style="color: #ef4444; font-weight: 600; text-decoration: line-through;">{{ row.badWord }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="goodWord" label="✅ 安全词 (替换使用)" min-width="200">
          <template #default="{ row }">
            <span style="color: #22c55e; font-weight: 500;">{{ row.goodWord }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑风控词' : '新增风控词'" width="480px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="违规词" required>
          <el-input v-model="form.badWord" placeholder="例如：保本、包赚" />
        </el-form-item>
        <el-form-item label="安全词" required>
          <el-input v-model="form.goodWord" placeholder="例如：体验、概率高" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { riskWordApi } from '../utils/api'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, badWord: '', goodWord: '' })

const loadData = async () => {
  loading.value = true
  try {
    const res = await riskWordApi.getList()
    list.value = res.data || []
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openDialog = (row) => {
  if (row) {
    form.value = { id: row.id, badWord: row.badWord, goodWord: row.goodWord }
  } else {
    form.value = { id: null, badWord: '', goodWord: '' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.badWord || !form.value.goodWord) return ElMessage.warning('请填写完整')
  saving.value = true
  try {
    if (form.value.id) {
      await riskWordApi.update(form.value.id, { badWord: form.value.badWord, goodWord: form.value.goodWord })
    } else {
      await riskWordApi.create({ badWord: form.value.badWord, goodWord: form.value.goodWord })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除这个风控词吗？', '提示', { type: 'warning' })
    await riskWordApi.delete(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(loadData)
</script>
