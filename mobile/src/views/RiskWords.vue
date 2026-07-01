<template>
  <div>
    <van-nav-bar title="风控红线字典" left-arrow @click-left="$router.back()" />

    <div class="risk-warning">
      <span style="font-size: 16px;">⚠️</span>
      <span>微信查得很严，必须按下方替换词聊天，违者罚款！</span>
    </div>

    <van-loading v-if="loading" style="text-align: center; padding: 40px;">加载中...</van-loading>

    <div class="risk-table" v-if="!loading && list.length > 0">
      <div class="risk-header">
        <span>❌ 违规词 (严禁)</span>
        <span>✅ 安全词 (替换)</span>
      </div>
      <div v-for="item in list" :key="item.id" class="risk-row">
        <span class="bad-word">{{ item.badWord }}</span>
        <span class="good-word">{{ item.goodWord }}</span>
      </div>
    </div>

    <van-empty v-if="!loading && list.length === 0" description="暂无风控词" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { riskWordApi } from '../utils/api'

const list = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await riskWordApi.getList()
    list.value = res.data || []
  } catch (e) { /* */ }
  loading.value = false
})
</script>

<style scoped>
.risk-warning {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  margin: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-red);
  display: flex;
  align-items: center;
  gap: 8px;
}
.risk-table {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin: 10px 16px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.risk-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent-red);
  background: rgba(239, 68, 68, 0.04);
  border-bottom: 1px solid var(--border-color);
}
.risk-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 14px;
}
.risk-row:last-child {
  border-bottom: none;
}
.bad-word {
  color: var(--accent-red);
  text-decoration: line-through;
  font-weight: 600;
}
.good-word {
  color: var(--accent-green);
  font-weight: 500;
}
</style>
