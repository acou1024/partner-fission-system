<template>
  <div>
    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="query">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="姓名/手机/微信号" clearable @clear="loadData" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable @change="loadData">
            <el-option label="正常" :value="1" />
            <el-option label="冻结" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">搜索</el-button>
          <el-button type="success" @click="openDialog()">新增合伙人</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <div class="table-card">
      <el-table :data="list" stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="wechatId" label="微信号" width="130" />
        <el-table-column label="上级" width="100">
          <template #default="{ row }">{{ row.parent?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="所属员工" width="100">
          <template #default="{ row }">{{ row.staff?.realName || '-' }}</template>
        </el-table-column>
        <el-table-column label="直推比例" width="90">
          <template #default="{ row }">{{ row.directRate }}%</template>
        </el-table-column>
        <el-table-column label="团队比例" width="90">
          <template #default="{ row }">{{ row.teamRate }}%</template>
        </el-table-column>
        <el-table-column label="客户数" width="80">
          <template #default="{ row }">{{ row._count?.customers || 0 }}</template>
        </el-table-column>
        <el-table-column label="下级数" width="80">
          <template #default="{ row }">{{ row._count?.children || 0 }}</template>
        </el-table-column>
        <el-table-column label="余额" width="100">
          <template #default="{ row }">
            <span style="color: #f59e0b; font-weight: 600;">¥{{ Number(row.balance).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="绑定状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.openId ? 'success' : 'info'" size="small">
              {{ row.openId ? '已绑定' : '未绑定' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '冻结' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="primary" @click="showQrCode(row)">邀请码</el-button>
            <el-button size="small" type="warning" @click="handleUnbindWechat(row)">解绑微信</el-button>
            <el-button v-if="row.status === 1" size="small" type="danger" @click="handleToggleStatus(row)">冻结</el-button>
            <el-button v-else size="small" type="success" @click="handleToggleStatus(row)">解冻</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑合伙人' : '新增合伙人'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" placeholder="请输入合伙人姓名" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="微信号">
          <el-input v-model="form.wechatId" placeholder="请输入微信号" />
        </el-form-item>
        <el-form-item label="上级合伙人" v-if="!isEdit">
          <el-select v-model="form.parentId" placeholder="无上级" clearable filterable>
            <el-option
              v-for="p in parentOptions"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分润模式">
          <el-radio-group v-model="form.rateMode">
            <el-radio value="fixed">固定比例</el-radio>
            <el-radio value="tiered">阶梯比例</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.rateMode === 'fixed'">
          <el-form-item label="直推比例(%)">
            <el-input-number v-model="form.directRate" :min="0" :max="100" :precision="2" :step="0.5" />
          </el-form-item>
        </template>
        <template v-else>
          <el-form-item label="阶梯配置">
            <div style="width: 100%;">
              <div v-for="(tier, idx) in form.tieredRatesArr" :key="idx" style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <span style="white-space: nowrap; font-size: 12px; color: #86868b;">流水≥</span>
                <el-input-number v-model="tier.min" :min="0" :precision="0" :step="10000" size="small" style="width: 120px;" />
                <span style="white-space: nowrap; font-size: 12px; color: #86868b;">→比例</span>
                <el-input-number v-model="tier.rate" :min="0" :max="100" :precision="2" :step="0.5" size="small" style="width: 100px;" />
                <span style="font-size: 12px; color: #86868b;">%</span>
                <el-button size="small" type="danger" text @click="form.tieredRatesArr.splice(idx, 1)">删除</el-button>
              </div>
              <el-button size="small" @click="form.tieredRatesArr.push({ min: 0, rate: 1.5 })">+ 添加档位</el-button>
            </div>
          </el-form-item>
        </template>
        <el-form-item label="团队比例(%)">
          <el-input-number v-model="form.teamRate" :min="0" :max="100" :precision="2" :step="0.5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 邀请码弹窗 -->
    <el-dialog v-model="qrDialogVisible" title="专属邀请码" width="400px">
      <div style="text-align: center;">
        <p style="margin-bottom: 12px; color: #6e6e73;">合伙人: <b>{{ qrData.name }}</b></p>
        <img v-if="qrData.qrCode" :src="qrData.qrCode" style="width: 200px; height: 200px;" />
        <p style="margin-top: 12px; font-size: 12px; color: #86868b;">
          邀请链接: {{ qrData.inviteUrl }}
        </p>
        <el-button type="primary" size="small" style="margin-top: 8px;" @click="copyLink">复制链接</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { partnerApi } from '../utils/api'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const total = ref(0)
const query = ref({ page: 1, pageSize: 20, keyword: '', status: '' })
const dialogVisible = ref(false)
const qrDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const form = ref({ name: '', phone: '', wechatId: '', parentId: null, directRate: 3.00, teamRate: 1.00, rateMode: 'fixed', tieredRatesArr: [] })
const qrData = ref({ name: '', qrCode: '', inviteUrl: '' })
const parentOptions = ref([])

const loadData = async () => {
  loading.value = true
  try {
    const res = await partnerApi.getList(query.value)
    list.value = res.data.list
    total.value = res.data.pagination.total
  } catch (e) { /* */ }
  loading.value = false
}

const loadParentOptions = async () => {
  try {
    const res = await partnerApi.getList({ pageSize: 500, status: 1 })
    // 只有没有上级的合伙人才能被选为上级（最多两级）
    parentOptions.value = (res.data.list || []).filter(p => !p.parentId)
  } catch (e) { /* */ }
}

const openDialog = (row) => {
  if (row) {
    isEdit.value = true
    editId.value = row.id
    let tieredArr = []
    try { tieredArr = row.tieredRates ? JSON.parse(row.tieredRates) : [] } catch (e) { tieredArr = [] }
    form.value = {
      name: row.name, phone: row.phone, wechatId: row.wechatId,
      directRate: Number(row.directRate), teamRate: Number(row.teamRate),
      rateMode: row.rateMode || 'fixed',
      tieredRatesArr: tieredArr,
    }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = { name: '', phone: '', wechatId: '', parentId: null, directRate: 3.00, teamRate: 1.00, rateMode: 'fixed', tieredRatesArr: [] }
    loadParentOptions()
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.value.name) return ElMessage.warning('请输入姓名')
  saving.value = true
  // 序列化阶梯配置
  const payload = { ...form.value }
  if (payload.rateMode === 'tiered' && payload.tieredRatesArr?.length > 0) {
    payload.tieredRates = JSON.stringify(payload.tieredRatesArr.sort((a, b) => a.min - b.min))
  } else {
    payload.tieredRates = null
  }
  delete payload.tieredRatesArr
  try {
    if (isEdit.value) {
      await partnerApi.update(editId.value, payload)
    } else {
      await partnerApi.create(payload)
    }
    ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { /* */ }
  saving.value = false
}

const handleToggleStatus = async (row) => {
  const isFreezing = row.status === 1
  const action = isFreezing ? '冻结' : '解冻'
  try {
    await ElMessageBox.confirm(`确定要${action}合伙人「${row.name}」吗？`, '提示', { type: 'warning' })
    if (isFreezing) {
      await partnerApi.delete(row.id)
    } else {
      await partnerApi.update(row.id, { status: 1 })
    }
    ElMessage.success(`已${action}`)
    loadData()
  } catch (e) { /* */ }
}

const handleUnbindWechat = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要解绑合伙人「${row.name}」的微信吗？解绑后该合伙人需要重新通过微信授权绑定。`, '解绑微信', { type: 'warning' })
    await partnerApi.unbindWechat(row.id)
    ElMessage.success('微信解绑成功')
    loadData()
  } catch (e) { /* */ }
}

const showQrCode = async (row) => {
  try {
    const res = await partnerApi.getQrCode(row.id)
    qrData.value = { name: row.name, ...res.data }
    qrDialogVisible.value = true
  } catch (e) { /* */ }
}

const copyLink = () => {
  navigator.clipboard.writeText(qrData.value.inviteUrl)
  ElMessage.success('链接已复制')
}

onMounted(loadData)
</script>
