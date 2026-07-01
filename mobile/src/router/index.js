/**
 * 合伙人移动端路由配置
 */
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/invite/:code',
    name: 'Invite',
    component: () => import('../views/Invite.vue'),
    meta: { title: '绑定账号', public: true },
  },
  {
    path: '/join/:code',
    name: 'CustomerJoin',
    component: () => import('../views/CustomerJoin.vue'),
    meta: { title: '加入', public: true },
  },
  {
    path: '/c/home',
    name: 'CustomerHome',
    component: () => import('../views/CustomerHome.vue'),
    meta: { title: '我的流水', customerAuth: true },
  },
  {
    path: '/',
    component: () => import('../layout/MobileLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { title: '工作台' },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/Customers.vue'),
        meta: { title: '我的客户' },
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('../views/Materials.vue'),
        meta: { title: '营销物料' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '我的' },
      },
    ],
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/Report.vue'),
    meta: { title: '报备客户' },
  },
  {
    path: '/commissions',
    name: 'Commissions',
    component: () => import('../views/Commissions.vue'),
    meta: { title: '上月分润' },
  },
  {
    path: '/ledger',
    name: 'Ledger',
    component: () => import('../views/Ledger.vue'),
    meta: { title: '记账本' },
  },
  {
    path: '/transactions',
    name: 'TransactionsHistory',
    component: () => import('../views/TransactionsHistory.vue'),
    meta: { title: '上月流水' },
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('../views/Team.vue'),
    meta: { title: '我的团队' },
  },
  {
    path: '/settlements',
    name: 'Settlements',
    component: () => import('../views/Settlements.vue'),
    meta: { title: '结算记录' },
  },
  {
    path: '/scripts',
    name: 'Scripts',
    component: () => import('../views/Scripts.vue'),
    meta: { title: '话术库' },
  },
  {
    path: '/projection',
    name: 'Projection',
    component: () => import('../views/Projection.vue'),
    meta: { title: '动态倍投精算表' },
  },
  {
    path: '/qa',
    name: 'QaList',
    component: () => import('../views/QaList.vue'),
    meta: { title: 'Q&A 反驳应对' },
  },
  {
    path: '/risk-words',
    name: 'RiskWords',
    component: () => import('../views/RiskWords.vue'),
    meta: { title: '风控红线字典' },
  },
]

const router = createRouter({
  history: createWebHistory('/m/'),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || '合伙人中心'
  // 客户端页面用单独的token
  if (to.meta.customerAuth) {
    const cToken = localStorage.getItem('customer_token')
    if (!cToken) {
      next('/login')
    } else {
      next()
    }
    return
  }

  const token = localStorage.getItem('partner_token')
  if (to.meta.public) {
    next()
  } else if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router
