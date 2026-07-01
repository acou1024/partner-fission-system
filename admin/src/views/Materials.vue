<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true">
        <el-form-item label="日期">
          <el-date-picker v-model="query.date" type="date" value-format="YYYY-MM-DD" placeholder="按日期筛选" clearable @change="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            name="files"
            multiple
            :show-file-list="false"
            accept="image/*"
            :on-success="onUploadSuccess"
            :on-error="onUploadError"
          >
            <el-button type="success">上传图片</el-button>
          </el-upload>
          <el-button type="danger" style="margin-left: 8px;" @click="handleClean" v-if="isAdmin">清理旧图</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        <div v-for="item in list" :key="item.id" class="material-item">
          <el-image :src="item.filePath" fit="cover" style="width: 100%; height: 180px; border-radius: 8px;" :preview-src-list="previewList" />
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="font-size: 12px; color: #86868b;">{{ item.uploadDate?.substring(0, 10) }}</span>
            <el-button size="small" type="danger" text @click="handleDelete(item)">删除</el-button>
          </div>
        </div>
      </div>
      <el-empty v-if="list.length === 0" description="暂无素材" />
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { materialApi } from '../utils/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin())
const loading = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 30, date: '' })

const uploadUrl = '/api/admin/materials'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
}))

const previewList = computed(() => list.value.map(i => i.filePath))

const loadData = async () => {
  loading.value = true
  try {
    const res = await materialApi.getList(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

const onUploadSuccess = () => {
  ElMessage.success('上传成功')
  loadData()
}

const onUploadError = () => {
  ElMessage.error('上传失败')
}

const handleDelete = async (item) => {
  try {
    await ElMessageBox.confirm('确定删除该素材？', '提示', { type: 'warning' })
    await materialApi.delete(item.id)
    ElMessage.success('已删除')
    loadData()
  } catch (e) { /* */ }
}

const handleClean = async () => {
  try {
    const { value } = await ElMessageBox.prompt('清理多少天前的旧图？', '清理旧素材', {
      inputValue: '30',
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入天数',
      type: 'warning',
    })
    await materialApi.clean({ days: parseInt(value) })
    ElMessage.success('清理完成')
    loadData()
  } catch (e) { /* */ }
}

onMounted(loadData)
</script>

<style scoped>
.material-item {
  background: #fff;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>
