<template>
  <div>
    <van-nav-bar title="Q&A 反驳应对" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px;">加载中...</van-loading>

    <div v-for="qa in list" :key="qa.id" class="qa-card">
      <div class="qa-question">
        <span class="qa-tag q">Q:</span>
        <span>{{ qa.question }}</span>
      </div>
      <div class="qa-answer">
        <span class="qa-tag a">A:</span>
        <span>{{ qa.answer }}</span>
      </div>
      <button class="copy-btn" @click="copyText(qa.answer)">复制回答</button>
    </div>

    <van-empty v-if="!loading && list.length === 0" description="暂无反驳话术" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { qaApi } from '../utils/api'

const list = ref([])
const loading = ref(true)

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast({ message: '已复制', position: 'bottom' })
  }).catch(() => {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast({ message: '已复制', position: 'bottom' })
  })
}

onMounted(async () => {
  try {
    const res = await qaApi.getList()
    list.value = res.data || []
  } catch (e) { /* */ }
  loading.value = false
})
</script>

<style scoped>
.qa-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin: 10px 16px;
  position: relative;
  box-shadow: var(--shadow-card);
}
.qa-question {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
  display: flex;
  gap: 6px;
  align-items: flex-start;
}
.qa-answer {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: flex;
  gap: 6px;
  align-items: flex-start;
  padding-right: 60px;
}
.qa-tag {
  font-weight: 700;
  flex-shrink: 0;
}
.qa-tag.q { color: var(--accent-red); }
.qa-tag.a { color: var(--accent-green); }
.copy-btn {
  position: absolute;
  bottom: 14px;
  right: 14px;
  font-size: 11px;
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-weight: 500;
}
</style>
