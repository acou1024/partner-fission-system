<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="合伙人">
          <el-select v-model="query.partnerId" placeholder="全部" clearable filterable @change="loadData">
            <el-option v-for="partner in partnerOptions" :key="partner.id" :label="partner.name" :value="partner.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            @change="onDateChange"
          />
        </el-form-item>
        <el-form-item label="归档状态">
          <el-select v-model="query.isArchived" placeholder="全部" clearable @change="loadData" style="width: 120px">
            <el-option label="未归档" :value="0" />
            <el-option label="已归档" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button type="success" @click="openDialog()">录入流水</el-button>
          <el-button type="warning" @click="openImportDialog">Excel导入</el-button>
          <el-button v-if="isAdmin" type="danger" plain @click="openArchiveDialog">一键归档</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="客户" min-width="120">
          <template #default="{ row }">{{ row.customer?.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="归属合伙人" min-width="120">
          <template #default="{ row }">{{ row.customer?.partner?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="方案" width="110">
          <template #default="{ row }">{{ row.plan || '-' }}</template>
        </el-table-column>
        <el-table-column label="流水金额" width="130" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ formatMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="回流金额" width="130" align="right">
          <template #default="{ row }">
            <span>{{ row.returnAmount == null ? '-' : `¥${formatMoney(row.returnAmount)}` }}</span>
          </template>
        </el-table-column>
        <el-table-column label="打单日期" width="120">
          <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
        </el-table-column>
        <el-table-column label="产生佣金" min-width="220">
          <template #default="{ row }">
            <div v-if="row.commissions?.length">
              <div v-for="commission in row.commissions" :key="commission.id" class="commission-line">
                <el-tag size="small" :type="commission.type === 'direct' ? 'success' : 'warning'">
                  {{ commission.type === 'direct' ? '直推' : '代理' }}
                </el-tag>
                <span>¥{{ formatMoney(commission.amount) }} ({{ Number(commission.rate).toFixed(2) }}%)</span>
                <el-tag v-if="commission.settled === 1" size="small" type="info">已结算</el-tag>
              </div>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column label="录入人" width="90">
          <template #default="{ row }">{{ row.operator?.realName || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isArchived === 1" type="info" size="small">已归档</el-tag>
            <el-tag v-else type="success" size="small">未归档</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="录入时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button v-if="isAdmin" size="small" type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑流水' : '录入流水'" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="选择客户" required>
          <el-select
            v-model="form.customerId"
            placeholder="搜索客户"
            filterable
            remote
            clearable
            :remote-method="searchCustomers"
            :loading="searchLoading"
            style="width: 100%"
          >
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="`${customer.nickname} (${customer.partner?.name || ''})`"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流水金额" required>
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="打单日期" required>
          <el-date-picker
            v-model="form.orderDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="方案">
          <el-input v-model="form.plan" placeholder="如 A、B、2.0" />
        </el-form-item>
        <el-form-item label="回流金额">
          <el-input-number
            v-model="form.returnAmount"
            :min="0"
            :precision="2"
            :step="100"
            style="width: 100%"
            placeholder="没有可留空"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">确认保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="Excel 批量导入流水" width="720px" :close-on-click-modal="false">
      <el-steps :active="importStep" finish-status="success" style="margin-bottom: 20px">
        <el-step title="上传文件" />
        <el-step title="预览确认" />
        <el-step title="导入结果" />
      </el-steps>

      <div v-if="importStep === 0">
        <el-form label-width="90px">
          <el-form-item label="打单日期" required>
            <el-date-picker
              v-model="importDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="选择文件">
            <el-upload
              ref="importUploadRef"
              :auto-upload="false"
              accept=".xlsx,.xls"
              :limit="1"
              :on-change="handleImportFileChange"
              :on-remove="() => { importFile = null; importPreview = null }"
              drag
              style="width: 100%"
            >
              <div style="padding: 20px">
                <el-icon style="font-size: 40px; color: #86868b"><UploadFilled /></el-icon>
                <div style="margin-top: 8px; color: #86868b">拖拽或点击上传 Excel 文件</div>
                <div style="margin-top: 4px; color: #aeaeb2; font-size: 12px">支持 .xlsx / .xls 格式</div>
              </div>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="importStep === 1 && importPreview">
        <el-form label-width="90px" style="margin-bottom: 12px">
          <el-form-item label="工作表">
            <el-select v-model="importSheetName" placeholder="选择工作表" @change="onSheetChange">
              <el-option
                v-for="sheet in importPreview.sheets"
                :key="sheet.name"
                :label="`${sheet.name} (${sheet.rowCount}条)`"
                :value="sheet.name"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <div style="margin-bottom: 8px; font-size: 13px">
          <el-tag type="success">已匹配 {{ importPreview.preview.filter((item) => item.matched).length }}</el-tag>
          <el-tag type="danger" style="margin-left: 8px">未匹配 {{ importPreview.preview.filter((item) => !item.matched).length }}</el-tag>
          <el-tag style="margin-left: 8px">共 {{ importPreview.preview.length }} 条</el-tag>
        </div>

        <el-table :data="importPreview.preview" max-height="350" size="small" stripe>
          <el-table-column prop="nickname" label="客户昵称" width="140" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="plan" label="方案" width="120" />
          <el-table-column label="匹配状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.matched ? 'success' : 'danger'" size="small">
                {{ row.matched ? '已匹配' : '未匹配' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="importPreview.preview.some((item) => !item.matched)" class="warning-text">
          未匹配的客户会被跳过，请先到客户管理中补充这些客户。
        </div>
      </div>

      <div v-if="importStep === 2 && importResult">
        <el-result
          :icon="importResult.created > 0 ? 'success' : 'warning'"
          title="导入完成"
          :sub-title="`成功 ${importResult.created} 条，跳过 ${importResult.skipped.length} 条`"
        >
          <template #extra>
            <div v-if="importResult.skipped.length > 0" class="skip-list">
              <div class="skip-title">跳过详情</div>
              <div v-for="(item, index) in importResult.skipped" :key="index" class="skip-item">
                {{ item.nickname }} - ¥{{ formatMoney(item.amount) }} - {{ item.reason }}
              </div>
            </div>
          </template>
        </el-result>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">关闭</el-button>
        <el-button
          v-if="importStep === 0"
          type="primary"
          :loading="importLoading"
          :disabled="!importFile || !importDate"
          @click="handlePreviewImport"
        >
          下一步：解析预览
        </el-button>
        <el-button v-if="importStep === 1" @click="importStep = 0">上一步</el-button>
        <el-button
          v-if="importStep === 1"
          type="success"
          :loading="importLoading"
          @click="handleConfirmImport"
        >
          确认导入 ({{ importPreview?.preview.filter((item) => item.matched).length || 0 }}条)
        </el-button>
        <el-button v-if="importStep === 2" type="primary" @click="finishImport">完成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="archiveVisible" title="一键归档月度流水" width="450px" :close-on-click-modal="false">
      <div class="archive-tip">
        <p>归档会把指定日期及之前的流水统一标记为“已归档”。</p>
        <p class="danger-tip">归档后，未归档口径的月度结算汇总和工作台数据都会从 0 重新开始累计。</p>
      </div>
      <el-form label-width="110px">
        <el-form-item label="归档截止日期" required>
          <el-date-picker
            v-model="archiveDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择归档日期"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="archiveVisible = false">关闭</el-button>
        <el-button type="danger" :loading="archiving" @click="handleArchive">确认归档</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { customerApi, partnerApi, transactionApi } from '../utils/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.isAdmin())

const loading = ref(false)
const saving = ref(false)
const searchLoading = ref(false)
const list = ref([])
const total = ref(0)
const dateRange = ref(null)
const query = ref({
  page: 1,
  pageSize: 20,
  partnerId: '',
  startDate: '',
  endDate: '',
  isArchived: '',
})

const dialogVisible = ref(false)
const editingId = ref(null)
const form = ref({
  customerId: null,
  amount: 0,
  orderDate: dayjs().format('YYYY-MM-DD'),
  plan: '',
  returnAmount: null,
  remark: '',
})

const partnerOptions = ref([])
const customerOptions = ref([])

const importVisible = ref(false)
const importStep = ref(0)
const importDate = ref(dayjs().format('YYYY-MM-DD'))
const importFile = ref(null)
const importSheetName = ref('')
const importPreview = ref(null)
const importResult = ref(null)
const importLoading = ref(false)
const importUploadRef = ref(null)

const archiveVisible = ref(false)
const archiveDate = ref(dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'))
const archiving = ref(false)

const formatDate = (value) => (value ? dayjs(value).format('YYYY-MM-DD') : '-')
const formatDateTime = (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-')
const formatMoney = (value) => Number(value || 0).toFixed(2)

const resetForm = () => {
  editingId.value = null
  form.value = {
    customerId: null,
    amount: 0,
    orderDate: dayjs().format('YYYY-MM-DD'),
    plan: '',
    returnAmount: null,
    remark: '',
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await transactionApi.getList(query.value)
    list.value = res.data?.list || []
    total.value = res.data?.pagination?.total || 0
  } catch (e) {
    ElMessage.error(e.message || '获取流水列表失败')
  } finally {
    loading.value = false
  }
}

const loadPartners = async () => {
  try {
    const res = await partnerApi.getList({ pageSize: 500, status: 1 })
    partnerOptions.value = res.data?.list || []
  } catch (e) {
    ElMessage.error(e.message || '获取合伙人列表失败')
  }
}

const searchCustomers = async (keyword) => {
  if (!keyword) return
  searchLoading.value = true
  try {
    const res = await customerApi.getList({ keyword, pageSize: 50 })
    customerOptions.value = res.data?.list || []
  } catch (e) {
    ElMessage.error(e.message || '搜索客户失败')
  } finally {
    searchLoading.value = false
  }
}

const onDateChange = (value) => {
  if (value) {
    query.value.startDate = value[0]
    query.value.endDate = value[1]
  } else {
    query.value.startDate = ''
    query.value.endDate = ''
  }
  query.value.page = 1
  loadData()
}

const openDialog = (row) => {
  if (row) {
    editingId.value = row.id
    form.value = {
      customerId: row.customer?.id || null,
      amount: Number(row.amount || 0),
      orderDate: formatDate(row.orderDate),
      plan: row.plan || '',
      returnAmount: row.returnAmount == null ? null : Number(row.returnAmount),
      remark: row.remark || '',
    }
    customerOptions.value = row.customer
      ? [{ id: row.customer.id, nickname: row.customer.nickname, partner: row.customer.partner }]
      : []
  } else {
    resetForm()
    customerOptions.value = []
  }
  dialogVisible.value = true
}

const buildPayload = () => ({
  customerId: form.value.customerId,
  amount: form.value.amount,
  orderDate: form.value.orderDate,
  plan: form.value.plan || null,
  returnAmount: form.value.returnAmount === null ? '' : form.value.returnAmount,
  remark: form.value.remark || null,
})

const handleSave = async () => {
  if (!form.value.customerId) return ElMessage.warning('请选择客户')
  if (!form.value.amount || form.value.amount <= 0) return ElMessage.warning('请输入流水金额')
  if (!form.value.orderDate) return ElMessage.warning('请选择打单日期')

  saving.value = true
  try {
    if (editingId.value) {
      await transactionApi.update(editingId.value, buildPayload())
      ElMessage.success('流水更新成功')
    } else {
      await transactionApi.create(buildPayload())
      ElMessage.success('流水录入成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('删除流水会同时回退相关佣金，确定删除吗？', '危险操作', {
      type: 'error',
    })
    await transactionApi.delete(row.id)
    ElMessage.success('已删除，佣金已回退')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

const openImportDialog = () => {
  importStep.value = 0
  importDate.value = dayjs().format('YYYY-MM-DD')
  importFile.value = null
  importPreview.value = null
  importResult.value = null
  importSheetName.value = ''
  importVisible.value = true
  nextTick(() => importUploadRef.value?.clearFiles())
}

const handleImportFileChange = (file) => {
  importFile.value = file.raw
}

const openArchiveDialog = () => {
  archiveDate.value = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
  archiveVisible.value = true
}

const handleArchive = async () => {
  if (!archiveDate.value) return ElMessage.warning('请选择归档截止日期')
  try {
    await ElMessageBox.confirm(
      `确定将 ${archiveDate.value} 及之前的流水全部归档吗？归档后未归档口径的统计会清零。`,
      '一键归档确认',
      { type: 'warning' }
    )
    archiving.value = true
    const res = await transactionApi.archive({ endDate: archiveDate.value })
    ElMessage.success(res.message || '归档成功')
    archiveVisible.value = false
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '归档失败')
    }
  } finally {
    archiving.value = false
  }
}

const handlePreviewImport = async () => {
  if (!importFile.value || !importDate.value) return ElMessage.warning('请选择文件和日期')
  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    const res = await transactionApi.previewImport(formData)
    importPreview.value = res.data
    importSheetName.value = res.data?.sheets?.[0]?.name || ''
    importStep.value = 1
  } catch (e) {
    ElMessage.error(e.message || '解析失败，请检查文件格式')
  } finally {
    importLoading.value = false
  }
}

const onSheetChange = async (name) => {
  if (!importFile.value) return
  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    formData.append('sheetName', name)
    const res = await transactionApi.previewImport(formData)
    importPreview.value = res.data
  } catch (e) {
    ElMessage.error(e.message || '切换工作表失败')
  } finally {
    importLoading.value = false
  }
}

const handleConfirmImport = async () => {
  if (!importFile.value || !importDate.value) return
  importLoading.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    formData.append('orderDate', importDate.value)
    formData.append('sheetName', importSheetName.value)
    const res = await transactionApi.importExcel(formData)
    importResult.value = res.data
    importStep.value = 2
    ElMessage.success(res.message || '导入完成')
  } catch (e) {
    ElMessage.error(e.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

const finishImport = () => {
  importVisible.value = false
  loadData()
}

onMounted(() => {
  resetForm()
  loadData()
  loadPartners()
})
</script>

<style scoped>
.search-bar {
  margin-bottom: 16px;
}

.amount-text {
  font-weight: 600;
  color: #3b82f6;
}

.commission-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.8;
}

.warning-text {
  margin-top: 8px;
  font-size: 12px;
  color: #f59e0b;
}

.skip-list {
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
}

.skip-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.skip-item {
  font-size: 12px;
  color: #86868b;
  line-height: 1.8;
}

.archive-tip {
  margin-bottom: 20px;
  line-height: 1.6;
  color: #606266;
}

.danger-tip {
  color: #f56c6c;
  font-weight: bold;
}
</style>
