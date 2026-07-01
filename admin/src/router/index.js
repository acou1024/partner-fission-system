/**
 * 管理后台路由配置
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
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据大盘', icon: 'DataBoard' },
      },
      {
        path: 'partners',
        name: 'Partners',
        component: () => import('../views/Partners.vue'),
        meta: { title: '合伙人管理', icon: 'User' },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/Customers.vue'),
        meta: { title: '客户管理', icon: 'UserFilled' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/Reports.vue'),
        meta: { title: '客户报备', icon: 'Bell' },
      },
      {
        path: 'transactions',
        name: 'Transactions',
        component: () => import('../views/Transactions.vue'),
        meta: { title: '流水录入', icon: 'Document' },
      },
      {
        path: 'ledgers',
        name: 'Ledgers',
        component: () => import('../views/Ledgers.vue'),
        meta: { title: '手工记账', icon: 'EditPen' },
      },
      {
        path: 'schemes',
        name: 'Schemes',
        component: () => import('../views/Schemes.vue'),
        meta: { title: '方案赔率', icon: 'Setting' },
      },
      {
        path: 'customer-profits',
        name: 'CustomerProfits',
        component: () => import('../views/CustomerProfits.vue'),
        meta: { title: '客户盈利', icon: 'TrendCharts' },
      },
      {
        path: 'settlements',
        name: 'Settlements',
        component: () => import('../views/Settlements.vue'),
        meta: { title: '结算管理', icon: 'Wallet' },
      },
      {
        path: 'monthly-settlements',
        name: 'MonthlySettlements',
        component: () => import('../views/MonthlySettlements.vue'),
        meta: { title: '月度结算汇总', icon: 'PieChart' },
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('../views/Materials.vue'),
        meta: { title: '素材管理', icon: 'Picture' },
      },
      {
        path: 'profiler',
        name: 'Profiler',
        component: () => import('../views/Profiler.vue'),
        meta: { title: '客户画像提取', icon: 'Aim' },
      },
      {
        path: 'scripts',
        name: 'Scripts',
        component: () => import('../views/Scripts.vue'),
        meta: { title: '话术管理', icon: 'ChatDotSquare' },
      },
      {
        path: 'qa',
        name: 'QaManage',
        component: () => import('../views/QaManage.vue'),
        meta: { title: 'Q&A反驳', icon: 'QuestionFilled' },
      },
      {
        path: 'risk-words',
        name: 'RiskWordManage',
        component: () => import('../views/RiskWordManage.vue'),
        meta: { title: '风控字典', icon: 'Warning' },
      },
      {
        path: 'staff',
        name: 'Staff',
        component: () => import('../views/Staff.vue'),
        meta: { title: '员工管理', icon: 'Avatar', adminOnly: true },
      },
      {
        path: 'domains',
        name: 'Domains',
        component: () => import('../views/Domains.vue'),
        meta: { title: '域名管理', icon: 'Link', adminOnly: true },
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('../views/Logs.vue'),
        meta: { title: '操作日志', icon: 'List', adminOnly: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.meta.public) {
    next()
  } else if (!token) {
    next('/login')
  } else if (to.meta.adminOnly) {
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}')
    if (user.role !== 'admin') {
      next('/dashboard')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
