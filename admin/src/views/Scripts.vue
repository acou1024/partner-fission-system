<template>
  <div>
    <div class="search-bar">
      <el-button type="success" @click="openCategoryDialog()">新增分类</el-button>
      <el-button type="primary" @click="openScriptDialog()">新增话术</el-button>
      <el-button type="warning" @click="openImportDialog()">批量导入</el-button>
    </div>

    <div class="table-card">
      <el-tree
        :data="treeData"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
      >
        <template #default="{ node, data }">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding-right: 8px;">
            <div>
              <el-tag v-if="data.isCategory" size="small" type="info" style="margin-right: 8px;">分类</el-tag>
              <el-tag v-else size="small" type="success" style="margin-right: 8px;">话术</el-tag>
              <span>{{ data.label }}</span>
              <span v-if="!data.isCategory" style="color: #86868b; margin-left: 12px; font-size: 12px;">
                {{ data.content?.substring(0, 60) }}{{ data.content?.length > 60 ? '...' : '' }}
              </span>
            </div>
            <div>
              <el-button v-if="data.isCategory" size="small" text type="primary" @click.stop="openCategoryDialog(data)">编辑</el-button>
              <el-button v-if="data.isCategory" size="small" text type="success" @click.stop="openScriptDialog(null, data.rawId)">添加话术</el-button>
              <el-button v-if="!data.isCategory" size="small" text type="primary" @click.stop="openScriptDialog(data)">编辑</el-button>
              <el-button size="small" text type="danger" @click.stop="handleDelete(data)">删除</el-button>
              <el-button v-if="!data.isCategory" size="small" text @click.stop="copyContent(data.content)">复制</el-button>
            </div>
          </div>
        </template>
      </el-tree>
      <el-empty v-if="treeData.length === 0" description="暂无话术分类" />
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="catDialogVisible" :title="catForm.id ? '编辑分类' : '新增分类'" width="420px">
      <el-form :model="catForm" label-width="80px">
        <el-form-item label="分类名称" required>
          <el-input v-model="catForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="上级分类">
          <el-select v-model="catForm.parentId" placeholder="无（顶级分类）" clearable>
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 话术弹窗 -->
    <el-dialog v-model="scriptDialogVisible" :title="scriptForm.id ? '编辑话术' : '新增话术'" width="650px">
      <el-form :model="scriptForm" label-width="80px">
        <el-form-item label="所属分类" required>
          <el-select v-model="scriptForm.categoryId" placeholder="请选择分类" filterable>
            <el-option v-for="c in allCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="话术标题" required>
          <el-input v-model="scriptForm.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="话术内容" required>
          <el-input v-model="scriptForm.content" type="textarea" :autosize="{ minRows: 6, maxRows: 20 }" placeholder="请输入话术内容" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="scriptForm.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scriptDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveScript">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入话术" width="700px">
      <el-form label-width="80px">
        <el-form-item label="目标分类" required>
          <el-select v-model="importCategoryId" placeholder="话术将导入到该分类下" filterable>
            <el-option v-for="c in allCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="导入方式">
          <el-radio-group v-model="importMode">
            <el-radio value="paste">粘贴文本</el-radio>
            <el-radio value="file">上传TXT文件</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="importMode === 'file'" label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            accept=".txt"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="() => importText = ''"
          >
            <el-button type="primary">选择 .txt 文件</el-button>
            <template #tip>
              <div style="color: #86868b; font-size: 12px;">支持 .txt 文本文件</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="importMode === 'paste'" label="话术文本">
          <el-input v-model="importText" type="textarea" :autosize="{ minRows: 10, maxRows: 20 }" placeholder="格式：每条话术用 --- 分隔，第一行为标题，后面为内容&#10;&#10;示例：&#10;第一步：破冰打招呼&#10;你好呀，我是XXX，之前是做什么的...&#10;---&#10;第二步：挖需求&#10;你现在这个情况，有没有想过..." />
        </el-form-item>
      </el-form>
      <div v-if="parsedItems.length > 0" style="margin: 0 0 16px; padding: 12px; background: #f0f9eb; border-radius: 8px;">
        <span style="color: #22c55e; font-weight: 600;">✅ 已解析 {{ parsedItems.length }} 条话术</span>
        <div v-for="(item, idx) in parsedItems.slice(0, 5)" :key="idx" style="font-size: 12px; color: #6e6e73; margin-top: 4px;">
          {{ idx + 1 }}. {{ item.title }}
        </div>
        <div v-if="parsedItems.length > 5" style="font-size: 12px; color: #86868b;">...还有 {{ parsedItems.length - 5 }} 条</div>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="parseImportText">解析预览</el-button>
        <el-button type="success" :loading="saving" :disabled="parsedItems.length === 0" @click="handleBulkImport">确认导入 ({{ parsedItems.length }}条)</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { scriptApi } from '../utils/api'

const saving = ref(false)
const treeData = ref([])
const categoryOptions = ref([])
const allCategories = ref([])
const catDialogVisible = ref(false)
const scriptDialogVisible = ref(false)
const catForm = ref({ id: null, name: '', parentId: null, sortOrder: 0 })
const scriptForm = ref({ id: null, categoryId: null, title: '', content: '', sortOrder: 0 })

const buildTree = (categories) => {
  const nodes = []
  for (const cat of categories) {
    const catNode = {
      id: `cat-${cat.id}`,
      rawId: cat.id,
      label: cat.name,
      isCategory: true,
      children: [],
    }
    // 添加话术内容为子节点
    if (cat.scripts) {
      for (const s of cat.scripts) {
        catNode.children.push({
          id: `script-${s.id}`,
          rawId: s.id,
          label: s.title,
          content: s.content,
          isCategory: false,
          categoryId: cat.id,
        })
      }
    }
    // 递归子分类
    if (cat.children) {
      catNode.children.push(...buildTree(cat.children))
    }
    nodes.push(catNode)
  }
  return nodes
}

const flattenCategories = (categories, result = []) => {
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name })
    if (cat.children) flattenCategories(cat.children, result)
  }
  return result
}

const loadData = async () => {
  try {
    const res = await scriptApi.getCategories()
    const raw = res.data || []
    treeData.value = buildTree(raw)
    categoryOptions.value = raw.filter(c => !c.parentId)
    allCategories.value = flattenCategories(raw)
  } catch (e) { /* */ }
}

const openCategoryDialog = (data) => {
  if (data) {
    catForm.value = { id: data.rawId, name: data.label, parentId: null, sortOrder: 0 }
  } else {
    catForm.value = { id: null, name: '', parentId: null, sortOrder: 0 }
  }
  catDialogVisible.value = true
}

const openScriptDialog = (data, defaultCategoryId) => {
  if (data) {
    scriptForm.value = { id: data.rawId, categoryId: data.categoryId, title: data.label, content: data.content, sortOrder: 0 }
  } else {
    scriptForm.value = { id: null, categoryId: defaultCategoryId || null, title: '', content: '', sortOrder: 0 }
  }
  scriptDialogVisible.value = true
}

const handleSaveCategory = async () => {
  if (!catForm.value.name) return ElMessage.warning('请输入分类名称')
  saving.value = true
  try {
    if (catForm.value.id) {
      await scriptApi.updateCategory(catForm.value.id, catForm.value)
    } else {
      await scriptApi.createCategory(catForm.value)
    }
    ElMessage.success('保存成功')
    catDialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const handleSaveScript = async () => {
  if (!scriptForm.value.categoryId) return ElMessage.warning('请选择分类')
  if (!scriptForm.value.title || !scriptForm.value.content) return ElMessage.warning('请填写标题和内容')
  saving.value = true
  try {
    if (scriptForm.value.id) {
      await scriptApi.updateScript(scriptForm.value.id, scriptForm.value)
    } else {
      await scriptApi.createScript(scriptForm.value)
    }
    ElMessage.success('保存成功')
    scriptDialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const handleDelete = async (data) => {
  const label = data.isCategory ? '分类' : '话术'
  try {
    await ElMessageBox.confirm(`确定删除${label}「${data.label}」吗？`, '提示', { type: 'warning' })
    if (data.isCategory) {
      await scriptApi.deleteCategory(data.rawId)
    } else {
      await scriptApi.deleteScript(data.rawId)
    }
    ElMessage.success('已删除')
    loadData()
  } catch (e) { /* */ }
}

const copyContent = (content) => {
  navigator.clipboard.writeText(content)
  ElMessage.success('已复制到剪贴板')
}

// ==================== 批量导入 ====================
const importDialogVisible = ref(false)
const importCategoryId = ref(null)
const importMode = ref('paste')
const importText = ref('')
const parsedItems = ref([])
const uploadRef = ref(null)

const openImportDialog = () => {
  importCategoryId.value = null
  importMode.value = 'paste'
  importText.value = ''
  parsedItems.value = []
  importDialogVisible.value = true
}

const handleFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    importText.value = e.target.result
    ElMessage.success('文件已读取，点击「解析预览」查看')
  }
  reader.readAsText(file.raw, 'UTF-8')
}

const parseImportText = () => {
  if (!importText.value.trim()) return ElMessage.warning('请先输入或上传话术文本')
  if (!importCategoryId.value) return ElMessage.warning('请先选择目标分类')

  const blocks = importText.value.split(/^---$/m).map(b => b.trim()).filter(Boolean)
  const items = []

  for (const block of blocks) {
    const lines = block.split('\n')
    const title = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()
    if (title && content) {
      items.push({ categoryId: importCategoryId.value, title, content })
    } else if (title && !content) {
      items.push({ categoryId: importCategoryId.value, title, content: title })
    }
  }

  parsedItems.value = items
  if (items.length === 0) {
    ElMessage.warning('未解析到有效话术，请检查格式（用 --- 分隔每条话术）')
  }
}

const handleBulkImport = async () => {
  if (parsedItems.value.length === 0) return
  saving.value = true
  try {
    await scriptApi.bulkImport({ items: parsedItems.value })
    ElMessage.success(`成功导入 ${parsedItems.value.length} 条话术`)
    importDialogVisible.value = false
    parsedItems.value = []
    loadData()
  } catch (e) { ElMessage.error('导入失败') }
  saving.value = false
}

onMounted(loadData)
</script>
