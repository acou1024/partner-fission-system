<template>
  <div>
    <van-nav-bar title="动态倍投精算表" left-arrow @click-left="$router.back()" />

    <div class="glass-card">
      <div style="font-size: 14px; color: var(--accent-blue); margin-bottom: 16px; font-weight: 600;">参数设置</div>
      <van-cell-group inset :border="false" style="background: transparent;">
        <van-field v-model="params.strategy" label="倍投策略" input-align="right" is-link readonly @click="showStrategy = true" />
        <van-field v-model="params.baseAmount" label="起始金额" type="digit" placeholder="10" input-align="right">
          <template #button><span style="color: var(--text-muted);">元</span></template>
        </van-field>
        <van-field v-model="params.stages" label="阶段数量" type="digit" placeholder="5" input-align="right">
          <template #button><span style="color: var(--text-muted);">期</span></template>
        </van-field>
        <van-field v-model="params.odds" label="赔率预估" type="number" :placeholder="currentDefaultOdds" input-align="right" />
        <van-field v-if="isFixedStrategy" v-model="params.multiplier" label="倍投系数" type="number" :placeholder="currentDefaultMultiplier" input-align="right" />
        <van-field v-else label="倍投系数" input-align="right" readonly model-value="智能2N+1" />
      </van-cell-group>
      <div style="padding: 16px 0 0;">
        <van-button type="primary" block round @click="calculate">开始推演</van-button>
      </div>
    </div>

    <!-- 推演结果 -->
    <div class="glass-card" v-if="result.length > 0">
      <div style="font-size: 14px; color: var(--accent-blue); margin-bottom: 12px; font-weight: 600;">推演结果</div>
      <div class="result-table">
        <div class="result-header">
          <span>阶段</span>
          <span>本期投入</span>
          <span>累计成本</span>
          <span>收回金额</span>
          <span>中奖纯利</span>
        </div>
        <div v-for="row in result" :key="row.stage" class="result-row">
          <span>{{ row.stage }}</span>
          <span>{{ row.input }}</span>
          <span>{{ row.totalCost }}</span>
          <span style="color: var(--accent-green);">{{ row.expectedReturn }}</span>
          <span :style="{ color: row.profitNum > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }">
            {{ row.profitNum > 0 ? '+' : '' }}{{ row.profit }}
          </span>
        </div>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: rgba(59,130,246,0.04); border-radius: 10px; border: 1px solid rgba(59,130,246,0.08);">
        <div style="font-size: 12px; color: var(--text-muted);">
          最大累计成本: <b style="color: var(--accent-red);">¥{{ maxTotalCost }}</b>
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          第{{ result.length }}期中奖纯利: <b style="color: var(--accent-green);">¥{{ result[result.length - 1]?.profit }}</b>
        </div>
      </div>
    </div>

    <!-- 策略提示 -->
    <div class="glass-card" style="font-size: 12px; color: var(--text-muted); line-height: 1.8;">
      💡 <b style="color: var(--text-secondary);">功能提示：</b>您可以自由切换【倍投策略】。<br/>
      <b>1.0 3倍投：</b>适合 1.6 左右赔率（如2-3球），抗连黑强；<br/>
      <b>2.0 2n+1倍投：</b>适合 2.0 左右赔率（如单选），资金更平滑；<br/>
      <b>3.0 2倍投：</b>适合 3.0 左右高赔率（如博高赔），投入极少，回报极高！
    </div>

    <!-- 策略选择 -->
    <van-action-sheet v-model:show="showStrategy" :actions="strategyOptions" @select="onSelectStrategy" cancel-text="取消" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { workbenchApi } from '../utils/api'

const showStrategy = ref(false)
const params = ref({
  baseAmount: '10',
  odds: '',
  stages: '5',
  multiplier: '',
  strategy: '1.0 3倍投',
  strategyValue: 'fixed_3x',
})
const result = ref([])
const maxTotalCost = ref(0)

const isFixedStrategy = computed(() => params.value.strategyValue.startsWith('fixed'))

const strategyDefaults = {
  fixed_3x: { odds: '1.66', multiplier: '3' },
  '2n1': { odds: '2.0', multiplier: '' },
  fixed_2x: { odds: '3.0', multiplier: '2' },
}

const currentDefaultOdds = computed(() => strategyDefaults[params.value.strategyValue]?.odds || '1.66')
const currentDefaultMultiplier = computed(() => strategyDefaults[params.value.strategyValue]?.multiplier || '3')

// 从后台加载默认配置
onMounted(async () => {
  try {
    const res = await workbenchApi.getProjectionConfig()
    if (res.data) {
      if (res.data.baseAmount) params.value.baseAmount = res.data.baseAmount
      if (res.data.odds) params.value.odds = res.data.odds
    }
  } catch (e) { /* 使用默认值 */ }
})

const strategyOptions = [
  { name: '1.0 3倍投', value: 'fixed_3x' },
  { name: '2.0 2n+1倍投', value: '2n1' },
  { name: '3.0 2倍投', value: 'fixed_2x' },
]

const onSelectStrategy = (item) => {
  params.value.strategy = item.name
  params.value.strategyValue = item.value
  // 切换策略时重置赔率和倍数为该策略的默认值
  const defaults = strategyDefaults[item.value]
  params.value.odds = defaults.odds
  params.value.multiplier = defaults.multiplier
  showStrategy.value = false
}

const calculate = () => {
  const base = parseFloat(params.value.baseAmount) || 10
  const strategy = params.value.strategyValue
  const defaults = strategyDefaults[strategy]
  const odds = parseFloat(params.value.odds) || parseFloat(defaults.odds)
  const multiplier = parseFloat(params.value.multiplier) || parseFloat(defaults.multiplier) || 3
  const stages = parseInt(params.value.stages) || 5

  const rows = []
  let totalCost = 0
  let prevInput = 0
  let maxTotal = 0

  for (let i = 0; i < stages; i++) {
    let currentInput = 0
    if (strategy === 'fixed_3x' || strategy === 'fixed_2x') {
      currentInput = base * Math.pow(multiplier, i)
    } else if (strategy === '2n1') {
      if (i === 0) currentInput = base
      else currentInput = prevInput * 2 + base
    }

    prevInput = currentInput
    totalCost += currentInput
    const estimatedReturn = currentInput * odds
    const profit = estimatedReturn - totalCost

    if (totalCost > maxTotal) maxTotal = totalCost

    rows.push({
      stage: `第${i + 1}期`,
      input: currentInput.toFixed(0),
      totalCost: totalCost.toFixed(0),
      expectedReturn: estimatedReturn.toFixed(0),
      profit: profit.toFixed(1),
      profitNum: profit,
    })
  }

  result.value = rows
  maxTotalCost.value = maxTotal.toFixed(0)
}
</script>

<style scoped>
.result-table {
  font-size: 12px;
  overflow-x: auto;
}
.result-header {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 1fr 1fr;
  gap: 4px;
  padding: 8px 0;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}
.result-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 1fr 1fr;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}
.result-row:last-child {
  border-bottom: none;
}
</style>
