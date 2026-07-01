<template>
  <div>
    <van-nav-bar title="话术库" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px;">加载中...</van-loading>

    <div v-for="cat in scripts" :key="cat.id">
      <div class="section-title">{{ cat.name }}</div>

      <!-- 子分类 -->
      <div v-for="child in (cat.children || [])" :key="child.id">
        <div style="font-size: 14px; color: var(--accent-blue); padding: 8px 16px 4px; font-weight: 600;">
          {{ child.name }}
        </div>
        <div v-for="s in (child.scripts || [])" :key="s.id" class="script-item" @click="copyText(s.content)">
          <div class="script-title">{{ s.title }}</div>
          <div class="script-content">{{ s.content }}</div>
          <div class="script-copy">点击复制</div>
        </div>
      </div>

      <!-- 直属话术 -->
      <div v-for="s in (cat.scripts || [])" :key="s.id" class="script-item" @click="copyText(s.content)">
        <div class="script-title">{{ s.title }}</div>
        <div class="script-content">{{ s.content }}</div>
        <div class="script-copy">点击复制</div>
      </div>
    </div>

    <van-empty v-if="!loading && scripts.length === 0" description="暂无话术" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { scriptApi } from '../utils/api'

const scripts = ref([])
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
    const res = await scriptApi.getList()
    scripts.value = res.data || []
  } catch (e) { /* */ }
  loading.value = false
})
</script>

<style scoped>
.script-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  margin: 8px 16px;
  cursor: pointer;
  position: relative;
}
.script-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.script-content {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}
.script-copy {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 11px;
  color: var(--accent-blue);
}
</style>
