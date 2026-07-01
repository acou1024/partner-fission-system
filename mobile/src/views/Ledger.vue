<template>
  <div class="page-container">
    <van-nav-bar title="手工记账本" left-arrow @click-left="$router.back()" fixed placeholder z-index="99" />

    <!-- 顶部统计卡片 -->
    <div class="stats-panel glass-card">
      <div class="stats-header">总盈利 (元)</div>
      <div class="stats-profit" :class="stats.totalProfit >= 0 ? 'positive' : 'negative'">
        {{ stats.totalProfit > 0 ? '+' : '' }}{{ formatNumber(stats.totalProfit) }}
      </div>
      <div class="stats-row">
        <div class="stats-item">
          <div class="s-label">总投入</div>
          <div class="s-value invest">¥{{ formatNumber(stats.totalInvest) }}</div>
        </div>
        <div class="stats-item">
          <div class="s-label">总回流</div>
          <div class="s-value return">¥{{ formatNumber(stats.totalReturn) }}</div>
        </div>
      </div>
    </div>

    <!-- 记账列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多记录了"
        @load="onLoad"
        class="list-container"
      >
        <div v-for="item in list" :key="item.id" class="ledger-item">
          <div class="l-header">
            <span class="l-date">{{ formatDate(item.recordDate) }}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="l-title">{{ item.title || '未分类' }}</span>
              <van-icon name="edit" color="#3b82f6" size="18" style="cursor: pointer;" @click="handleEdit(item)" />
              <van-icon name="delete-o" color="#ee0a24" size="18" style="cursor: pointer;" @click="handleDelete(item)" />
            </div>
          </div>
          <div class="l-body">
            <div class="l-col">
              <span class="l-lbl text-muted">投入资金</span>
              <span class="l-val">¥{{ formatNumber(item.investAmount) }}</span>
            </div>
            <div class="l-col" style="text-align: center;">
              <span class="l-lbl text-muted">回流资金</span>
              <span class="l-val return-color">¥{{ formatNumber(item.returnAmount) }}</span>
            </div>
            <div class="l-col" style="text-align: right;">
              <span class="l-lbl text-muted">利润结余</span>
              <span class="l-val" :class="item.profitAmount >= 0 ? 'profit-pos' : 'profit-neg'">
                {{ item.profitAmount > 0 ? '+' : '' }}¥{{ formatNumber(item.profitAmount) }}
              </span>
            </div>
          </div>
        </div>
      </van-list>
      <van-empty v-if="list.length === 0 && !loading && !refreshing" description="点击下方按钮记一笔吧" />
    </van-pull-refresh>

    <!-- 悬浮添加按钮 -->
    <div class="fab-btn" @click="editingId = null; showAddPopup = true">
      <van-icon name="plus" size="24" />
      <span>记一笔</span>
    </div>

    <!-- 添加记录弹窗 -->
    <van-popup v-model:show="showAddPopup" position="bottom" round safe-area-inset-bottom>
      <div class="popup-container">
        <div class="popup-title">{{ editingId ? '修改记账' : '新增记账' }}</div>
        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="form.recordDate"
              is-link
              readonly
              name="date"
              label="记账日期"
              placeholder="选择日期"
              @click="showDatePicker = true"
            />
            <van-field
              v-model="form.title"
              name="title"
              label="名目/标题"
              placeholder="如：体彩投入 (可选)"
            />
            <van-field
              v-model="form.investAmount"
              type="number"
              name="investAmount"
              label="投入资金"
              placeholder="请输入投入金额"
              :rules="[{ required: true, message: '请填写投入资金' }]"
            />
            <van-field
              v-model="form.returnAmount"
              type="number"
              name="returnAmount"
              label="回流资金"
              placeholder="请输入回流金额"
              :rules="[{ required: true, message: '请填写回流资金' }]"
            />
          </van-cell-group>
          <div style="margin: 24px 16px 16px;">
            <van-button round block type="primary" native-type="submit" :loading="submitting">
              保存记录
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 日期选择器 -->
    <van-popup v-model:show="showDatePicker" position="bottom" round safe-area-inset-bottom>
      <van-date-picker
        v-model="currentDate"
        title="选择日期"
        @confirm="onConfirmDate"
        @cancel="showDatePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ledgerApi } from '../utils/api'
import { showToast, showConfirmDialog } from 'vant'
import dayjs from 'dayjs'

const stats = ref({ totalInvest: 0, totalReturn: 0, totalProfit: 0 })
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

const showAddPopup = ref(false)
const showDatePicker = ref(false)
const submitting = ref(false)
const editingId = ref(null)

const todayArr = dayjs().format('YYYY-MM-DD').split('-')
const currentDate = ref(todayArr)
const form = ref({
  recordDate: dayjs().format('YYYY-MM-DD'),
  title: '',
  investAmount: '',
  returnAmount: ''
})

const formatNumber = (num) => Number(num || 0).toFixed(2)
const formatDate = (d) => d ? dayjs(d).format('YYYY-MM-DD') : '-'

const loadStats = async () => {
  try {
    const res = await ledgerApi.getStats()
    stats.value = res.data || { totalInvest: 0, totalReturn: 0, totalProfit: 0 }
  } catch (e) { /* */ }
}

const onLoad = async () => {
  if (refreshing.value) {
    list.value = []
    refreshing.value = false
  }
  
  try {
    const res = await ledgerApi.getList({ page: page.value, pageSize: 20 })
    const records = res.data.list || []
    list.value.push(...records)
    
    if (records.length < 20 || list.value.length >= res.data.pagination.total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    finished.value = true
  }
  loading.value = false
}

const onRefresh = async () => {
  list.value = []
  finished.value = false
  loading.value = true
  page.value = 1
  await loadStats()
  onLoad()
}

const onConfirmDate = ({ selectedValues }) => {
  form.value.recordDate = selectedValues.join('-')
  showDatePicker.value = false
}

const onSubmit = async () => {
  if (parseFloat(form.value.investAmount) < 0 || parseFloat(form.value.returnAmount) < 0) {
    return showToast('金额不能小于0')
  }
  submitting.value = true
  try {
    const payload = {
      recordDate: form.value.recordDate,
      title: form.value.title || '未分类',
      investAmount: parseFloat(form.value.investAmount),
      returnAmount: parseFloat(form.value.returnAmount)
    }

    if (editingId.value) {
      await ledgerApi.update(editingId.value, payload)
      showToast('修改成功')
    } else {
      await ledgerApi.create(payload)
      showToast('记账成功')
    }

    showAddPopup.value = false
    editingId.value = null
    
    // 重置表单
    form.value = {
      recordDate: dayjs().format('YYYY-MM-DD'),
      title: '',
      investAmount: '',
      returnAmount: ''
    }
    
    // 刷新列表和统计
    onRefresh()
  } catch (e) {
    console.error(e)
  }
  submitting.value = false
}

const handleEdit = (item) => {
  editingId.value = item.id
  form.value = {
    recordDate: dayjs(item.recordDate).format('YYYY-MM-DD'),
    title: item.title || '',
    investAmount: String(Number(item.investAmount)),
    returnAmount: String(Number(item.returnAmount))
  }
  currentDate.value = dayjs(item.recordDate).format('YYYY-MM-DD').split('-')
  showAddPopup.value = true
}

onMounted(() => {
  loadStats()
})

const handleDelete = async (item) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: `确定删除 ${formatDate(item.recordDate)} 的记账记录吗？`,
    })
    await ledgerApi.remove(item.id)
    showToast('删除成功')
    onRefresh()
  } catch (e) { /* 取消 */ }
}
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 80px; /* 为底部按钮留空间 */
}

.stats-panel {
  margin: 16px;
  padding: 24px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.stats-header {
  font-size: 13px;
  color: #646566;
  margin-bottom: 8px;
}

.stats-profit {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 24px;
}

.positive { color: #10b981; }
.negative { color: #f56c6c; }

.stats-row {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #f0f2f5;
  padding-top: 16px;
}

.stats-item {
  flex: 1;
}

.s-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 4px;
}

.s-value {
  font-size: 16px;
  font-weight: 600;
}

.s-value.invest { color: #606266; }
.s-value.return { color: #3b82f6; }

.list-container {
  padding: 0 16px;
}

.ledger-item {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.l-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #f0f2f5;
}

.l-date {
  font-size: 14px;
  font-weight: bold;
  color: #323233;
}

.l-title {
  font-size: 13px;
  color: #969799;
}

.l-body {
  display: flex;
  justify-content: space-between;
}

.l-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.l-lbl {
  font-size: 11px;
}

.text-muted {
  color: #969799;
}

.l-val {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}

.return-color {
  color: #3b82f6;
}

.profit-pos {
  color: #10b981;
}

.profit-neg {
  color: #f56c6c;
}

/* 底部悬浮按钮 */
.fab-btn {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--van-primary-color, #1989fa);
  color: white;
  padding: 12px 32px;
  border-radius: 100px;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.4);
  font-size: 16px;
  font-weight: bold;
  z-index: 99;
  cursor: pointer;
  transition: opacity 0.2s;
}

.fab-btn:active {
  opacity: 0.8;
}

.popup-container {
  padding: 16px 0;
}

.popup-title {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 16px;
}
</style>
