<template>
  <div>
    <div class="page-title">营销物料</div>

    <van-tabs v-model:active="activeTab" color="var(--accent-blue)" title-active-color="var(--accent-blue)" title-inactive-color="var(--text-muted)" background="transparent">
      <van-tab title="方案图片">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
            <div class="waterfall">
              <div v-for="item in list" :key="item.id" class="waterfall-item" @click="previewImage(item.filePath)">
                <img :src="item.filePath" loading="lazy" />
                <div class="img-date">{{ item.uploadDate?.substring(0, 10) }}</div>
              </div>
            </div>
            <van-empty v-if="!loading && list.length === 0" description="暂无方案图片" />
          </van-list>
        </van-pull-refresh>
      </van-tab>

      <van-tab title="话术库">
        <div v-for="cat in scripts" :key="cat.id" style="margin-bottom: 8px;">
          <div class="section-title" style="padding-left: 0;">{{ cat.name }}</div>
          <div v-for="child in (cat.children || [])" :key="child.id" style="margin-left: 8px;">
            <div style="font-size: 14px; color: var(--accent-blue); padding: 8px 0 4px;">{{ child.name }}</div>
            <div v-for="s in (child.scripts || [])" :key="s.id" class="script-item" @click="copyText(s.content)">
              <div class="script-title">{{ s.title }}</div>
              <div class="script-content">{{ s.content }}</div>
              <div class="script-copy">点击复制</div>
            </div>
          </div>
          <div v-for="s in (cat.scripts || [])" :key="s.id" class="script-item" @click="copyText(s.content)">
            <div class="script-title">{{ s.title }}</div>
            <div class="script-content">{{ s.content }}</div>
            <div class="script-copy">点击复制</div>
          </div>
        </div>
        <van-empty v-if="scripts.length === 0" description="暂无话术" />
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { showToast, showImagePreview } from 'vant'
import { materialApi, scriptApi } from '../utils/api'

const activeTab = ref(0)
const list = ref([])
const scripts = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)

const loadMore = async () => {
  try {
    const res = await materialApi.getList({ page: page.value, pageSize: 20 })
    const items = res.data.list || []
    list.value.push(...items)
    if (list.value.length >= res.data.pagination.total) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (e) {
    finished.value = true
  }
  loading.value = false
}

const onRefresh = () => {
  list.value = []
  page.value = 1
  finished.value = false
  refreshing.value = false
  loadMore()
}

const previewImage = (url) => {
  showImagePreview({ images: list.value.map(i => i.filePath), startPosition: list.value.findIndex(i => i.filePath === url) })
}

const loadScripts = async () => {
  try {
    const res = await scriptApi.getList()
    scripts.value = res.data || []
  } catch (e) { /* */ }
}

const copyText = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast({ message: '已复制', position: 'bottom' })
  }).catch(() => {
    // 兼容不支持clipboard的浏览器
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast({ message: '已复制', position: 'bottom' })
  })
}

loadScripts()
</script>

<style scoped>
.waterfall {
  columns: 2;
  column-gap: 8px;
  padding: 8px 16px;
}
.waterfall-item {
  break-inside: avoid;
  margin-bottom: 8px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
.waterfall-item img {
  width: 100%;
  display: block;
}
.img-date {
  padding: 6px 8px;
  font-size: 11px;
  color: var(--text-muted);
}
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
