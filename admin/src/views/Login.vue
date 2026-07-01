<template>
  <div class="login-page">
    <div class="login-card">
      <h2>合伙人管理系统</h2>
      <p class="subtitle">管理后台登录</p>
      <el-form :model="form" @keyup.enter="handleLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%;" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
// 测试阶段自动填充账号密码
const form = ref({ username: 'admin', password: 'admin123' })

const handleLogin = async () => {
  // 去空格
  form.value.username = (form.value.username || '').trim()
  form.value.password = (form.value.password || '').trim()
  if (!form.value.username || !form.value.password) {
    return ElMessage.warning('请输入用户名和密码')
  }
  loading.value = true
  try {
    await userStore.login(form.value.username, form.value.password)
    ElMessage.success('登录成功')
    await router.push('/dashboard')
  } catch (e) {
    ElMessage.error(e?.message || '登录失败，请检查后端服务是否启动')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
}
.login-card {
  background: #fff;
  border-radius: 18px;
  padding: 48px 40px;
  width: 400px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}
.login-card h2 {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 4px;
}
.subtitle {
  text-align: center;
  color: #86868b;
  margin-bottom: 32px;
  font-size: 14px;
}
</style>
