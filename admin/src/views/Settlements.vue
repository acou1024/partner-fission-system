<template>
  <div>
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="合伙人">
          <el-select v-model="query.partnerId" placeholder="全部" clearable filterable @change="loadData">
            <el-option v-for="p in partnerOptions" :key="p.id" :label="`${p.name} (余额: ¥${Number(p.balance).toFixed(2)})`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button type="success" @click="openDialog">结算出款</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="合伙人" width="120">
          <template #default="{ row }">{{ row.partner?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="结算金额" width="140">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #22c55e;">¥{{ Number(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="结算时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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

    <!-- 结算弹窗 -->
    <el-dialog v-model="dialogVisible" title="结算出款" width="450px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        线下转账完成后，在此标记结算，系统将自动扣减合伙人余额。
      </el-alert>
      <el-form :model="form" label-width="90px">
        <el-form-item label="合伙人" required>
          <el-select v-model="form.partnerId" placeholder="选择合伙人" filterable @change="onPartnerChange">
            <el-option v-for="p in settleOptions" :key="p.id" :label="`${p.name} (余额: ¥${Number(p.balance).toFixed(2)})`" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前余额">
          <span style="font-size: 18px; font-weight: 700; color: #f59e0b;">¥{{ Number(selectedBalance).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="结算金额" required>
          <el-input-number v-model="form.amount" :min="0.01" :max="Number(selectedBalance)" :precision="2" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" placeholder="如：微信转账凭证号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSettle">确认结算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { settlementApi, partnerApi } from '../utils/api'
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 20, partnerId: '' })
const dialogVisible = ref(false)
const form = ref({ partnerId: null, amount: 0, remark: '' })
const partnerOptions = ref([])
const settleOptions = ref([])
const selectedBalance = ref(0)

const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'

const loadData = async () => {
  loading.value = true
  try {
    const res = await settlementApi.getList(query.value)
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

const onPartnerChange = (id) => {
  const p = settleOptions.value.find(item => item.id === id)
  selectedBalance.value = p ? Number(p.balance) : 0
  form.value.amount = selectedBalance.value
}

const openDialog = async () => {
  form.value = { partnerId: null, amount: 0, remark: '' }
  selectedBalance.value = 0
  try {
    const res = await partnerApi.getList({ pageSize: 500, status: 1 })
    settleOptions.value = (res.data.list || []).filter(p => Number(p.balance) > 0)
  } catch (e) { /* */ }
  dialogVisible.value = true
}

const handleSettle = async () => {
  if (!form.value.partnerId) return ElMessage.warning('请选择合伙人')
  if (!form.value.amount || form.value.amount <= 0) return ElMessage.warning('请输入结算金额')
  try {
    await ElMessageBox.confirm(`确认已向该合伙人转账 ¥${form.value.amount.toFixed(2)} 元？`, '结算确认', { type: 'warning' })
    saving.value = true
    await settlementApi.create(form.value)
    ElMessage.success('结算成功')
    dialogVisible.value = false
    loadData()
    loadPartners()
  } catch (e) { /* */ }
  saving.value = false
}

onMounted(() => { loadData(); loadPartners() })
</script>
