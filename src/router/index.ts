import { createRouter, createWebHistory } from 'vue-router'

import { hasPermission, hasValidSession, restoreGestionSession } from '@/services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/',
      redirect: '/tablero-01',
    },
    {
      path: '/tablero-02',
      name: 'tablero-02',
      component: () => import('@/views/GestionDashboardShadcn.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tablero-01',
      name: 'tablero-01',
      component: () => import('@/views/GestionDashboard01.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/mi-cuenta',
      name: 'mi-cuenta',
      component: () => import('@/views/MiCuentaView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/configuracion-general',
      name: 'configuracion-general',
      component: () => import('@/views/ConfiguracionGeneralView.vue'),
      meta: {
        requiresAuth: true,
        permission: 'gestion.configurar',
      },
    },
    {
      path: '/administracion-usuarios',
      name: 'administracion-usuarios',
      component: () => import('@/views/AdministracionUsuariosView.vue'),
      meta: {
        requiresAuth: true,
        permission: 'gestion.administrar_usuarios',
      },
    },
    {
      path: '/gestion-shadcn',
      redirect: '/tablero-02'
    },
    {
      path: '/gestion-dashboard-01',
      redirect: '/tablero-01'
    },
    {
      path: '/gestion-prime',
      name: 'gestion-prime',
      component: () => import('@/views/GestionDashboardPrime.vue'),
      meta: { requiresAuth: true },
    }
  ]
})

router.beforeEach(async (to) => {
  const hasSession = hasValidSession()
  const restored = hasSession ? await restoreGestionSession() : false

  if (to.meta.requiresAuth && (!restored || !hasPermission('gestion.consultar'))) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (
    typeof to.meta.permission === 'string'
    && !hasPermission(to.meta.permission)
  ) {
    return { name: 'tablero-01' }
  }

  if (to.meta.guestOnly && restored && hasPermission('gestion.consultar')) {
    return { name: 'tablero-01' }
  }

  return true
})

window.addEventListener('gestion-auth:expired', () => {
  const currentRoute = router.currentRoute.value
  if (currentRoute.name !== 'login') {
    void router.replace({
      name: 'login',
      query: { redirect: currentRoute.fullPath },
    })
  }
})

export default router
