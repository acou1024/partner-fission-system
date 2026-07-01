<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <div class="admin-sidebar">
      <div class="logo">合伙人管理系统</div>
      <el-menu
        :default-active="$route.path"
        background-color="#ffffff"
        text-color="#6e6e73"
        active-text-color="#3b82f6"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>数据大盘</span>
        </el-menu-item>

        <el-sub-menu index="partner-group">
          <template #title>
            <el-icon><User /></el-icon>
            <span>业务管理</span>
          </template>
          <el-menu-item index="/partners">合伙人管理</el-menu-item>
          <el-menu-item index="/customers">客户管理</el-menu-item>
          <el-menu-item index="/reports">
            客户报备
            <el-badge v-if="pendingCount > 0" :value="pendingCount" class="badge-item" />
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="finance-group">
          <template #title>
            <el-icon><Wallet /></el-icon>
            <span>财务管理</span>
          </template>
          <el-menu-item index="/transactions">流水录入</el-menu-item>
          <el-menu-item index="/ledgers">合伙人记账本</el-menu-item>
          <el-menu-item index="/schemes">方案赔率</el-menu-item>
          <el-menu-item index="/customer-profits">客户盈利</el-menu-item>
          <el-menu-item index="/settlements">结算管理</el-menu-item>
          <el-menu-item index="/monthly-settlements">月度结算汇总</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="knowledge-group">
          <template #title>
            <el-icon><FolderOpened /></el-icon>
            <span>知识库</span>
          </template>
          <el-menu-item index="/materials">素材管理</el-menu-item>
          <el-menu-item index="/profiler">客户画像提取</el-menu-item>
          <el-menu-item index="/scripts">话术管理</el-menu-item>
          <el-menu-item index="/qa">Q&A反驳</el-menu-item>
          <el-menu-item index="/risk-words">风控字典</el-menu-item>
        </el-sub-menu>

        <el-sub-menu v-if="userStore.isAdmin()" index="system-group">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/staff">员工管理</el-menu-item>
          <el-menu-item index="/domains">域名管理</el-menu-item>
          <el-menu-item index="/logs">操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </div>

    <!-- 主内容区 -->
    <div class="admin-main">
      <div class="admin-header">
        <span style="font-size: 16px; color: #1d1d1f;">
          {{ $route.meta.title }}
        </span>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="color: #86868b;">{{ userStore.userInfo.realName }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar :size="36" style="cursor: pointer; background: #3b82f6;">
              {{ userStore.userInfo.realName?.charAt(0) || 'U' }}
            </el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="admin-content">
        <router-view />
      </div>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="400px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="原密码">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { authApi, reportApi } from '../utils/api'

const router = useRouter()
const userStore = useUserStore()

const pendingCount = ref(0)
const pwdDialogVisible = ref(false)
const pwdForm = ref({ oldPassword: '', newPassword: '' })

onMounted(async () => {
  try {
    const res = await reportApi.getList({ status: 'pending', pageSize: 1 })
    pendingCount.value = res.data.pagination.total
  } catch (e) { /* ignore */ }
})

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (cmd === 'password') {
    pwdForm.value = { oldPassword: '', newPassword: '' }
    pwdDialogVisible.value = true
  }
}

const handleChangePassword = async () => {
  try {
    await authApi.changePassword(pwdForm.value)
    ElMessage.success('密码修改成功')
    pwdDialogVisible.value = false
  } catch (e) { /* handled by interceptor */ }
}
</script>

<style scoped>
.badge-item {
  margin-left: 8px;
}
</style>
