<template>
  <div>
    <div class="search-bar">
      <el-button type="primary" @click="openDialog()">新增反驳话术</el-button>
    </div>

    <div class="table-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="question" label="❌ 客户提问" min-width="200">
          <template #default="{ row }">
            <span style="color: #ef4444; font-weight: 600;">{{ row.question }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="answer" label="✅ 高情商回答" min-width="300">
          <template #default="{ row }">
            <span style="color: #22c55e;">{{ row.answer }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
            <el-button size="small" text @click="copyText(row.answer)">复制</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑反驳话术' : '新增反驳话术'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="客户提问" required>
          <el-input v-model="form.question" placeholder="例如：这算不算诈骗？" />
        </el-form-item>
        <el-form-item label="高情商回答" required>
          <el-input v-model="form.answer" type="textarea" :rows="4" placeholder="高情商反驳/回答..." />
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
import { qaApi } from '../utils/api'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const form = ref({ id: null, question: '', answer: '' })

const loadData = async () => {
  loading.value = true
  try {
    const res = await qaApi.getList()
    list.value = res.data || []
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openDialog = (row) => {
  if (row) {
    form.value = { id: row.id, question: row.question, answer: row.answer }
  } else {
    form.value = { id: null, question: '', answer: '' }
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.question || !form.value.answer) return ElMessage.warning('请填写完整')
  saving.value = true
  try {
    if (form.value.id) {
      await qaApi.update(form.value.id, { question: form.value.question, answer: form.value.answer })
    } else {
      await qaApi.create({ question: form.value.question, answer: form.value.answer })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除这条反驳话术吗？', '提示', { type: 'warning' })
    await qaApi.delete(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

onMounted(loadData)
</script>
