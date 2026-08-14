<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
    CalendarRange,
    House,
    LayoutDashboard,
    LineChart,
    LogOut,
    Menu,
    PanelLeft,
    Settings,
    TableProperties,
    UserRound,
    UsersRound,
    X,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import GestionThemeToggle from '@/components/gestion/GestionThemeToggle.vue'
import GestionAlertsMenu from '@/components/gestion/GestionAlertsMenu.vue'
import GestionFullscreenToggle from '@/components/gestion/GestionFullscreenToggle.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useGestionAlerts } from '@/composables/useGestionAlerts'
import { useGestionSectionNavigation } from '@/composables/useGestionSectionNavigation'
import type { GestionAlert } from '@/lib/gestionAlerts'
import { authUser, hasPermission, logout } from '@/services/auth'

const props = withDefaults(defineProps<{
    alerts?: GestionAlert[]
    pageTitle?: string
}>(), {
    pageTitle: 'Resumen general',
})

const isCollapsed = ref(true)
const isMobileOpen = ref(false)
const router = useRouter()
const { activeSection, navigateToSection } = useGestionSectionNavigation()
const {
    alerts: globalAlerts,
    isLoading: areGlobalAlertsLoading,
    error: globalAlertsError,
    load: loadGlobalAlerts,
} = useGestionAlerts()

const displayedAlerts = computed(() => props.alerts ?? globalAlerts.value)
const isAlertsLoading = computed(
    () => props.alerts === undefined && areGlobalAlertsLoading.value
)
const alertsError = computed(
    () => props.alerts === undefined ? globalAlertsError.value : null
)

onMounted(() => {
    if (props.alerts === undefined) void loadGlobalAlerts()
})

type NavigationItem = {
    label: string
    href: string
    icon: typeof LayoutDashboard
    section?: string
    routeName?: string
}

type NavigationGroup = {
    label: string
    items: NavigationItem[]
}

const dashboardNavigationGroups: NavigationGroup[] = [
    {
        label: 'Principal',
        items: [
            { label: 'Resumen', href: '/tablero-01#resumen', section: '#resumen', icon: LayoutDashboard },
            { label: 'Proyección', href: '/tablero-01#proyeccion', section: '#proyeccion', icon: CalendarRange },
        ],
    },
    {
        label: 'Análisis',
        items: [
            { label: 'Tendencias', href: '/tablero-01#tendencias', section: '#tendencias', icon: LineChart },
            { label: 'Detalle', href: '/tablero-01#detalle', section: '#detalle', icon: TableProperties },
        ],
    },
]

const navigationGroups = computed<NavigationGroup[]>(() => {
    const routeName = router.currentRoute.value.name

    if (
        routeName === 'mi-cuenta'
        || routeName === 'configuracion-general'
        || routeName === 'administracion-usuarios'
    ) {
        return [
            {
                label: 'Principal',
                items: [
                    {
                        label: 'Panel de gestión',
                        href: '/tablero-01',
                        routeName: 'tablero-01',
                        icon: LayoutDashboard,
                    },
                ],
            },
        ]
    }

    return dashboardNavigationGroups
})

function isNavigationActive(item: NavigationItem) {
    if (item.routeName) {
        return router.currentRoute.value.name === item.routeName
    }

    return (
        router.currentRoute.value.name === 'tablero-01'
        && activeSection.value === item.section
    )
}

function selectNavigation(section?: string) {
    if (section) navigateToSection(section)
    isMobileOpen.value = false
}

function closeSession() {
    logout()
    void router.replace('/login')
}
</script>

<template>
    <div class="min-h-screen bg-sidebar">
        <button
            v-if="isMobileOpen"
            class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Cerrar navegación"
            @click="isMobileOpen = false"
        />

        <aside
            class="fixed inset-y-0 left-0 z-50 flex border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 ease-out"
            :class="[
                isCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
                isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0',
            ]"
        >
            <div class="flex min-w-0 flex-1 flex-col">
                <div class="flex h-16 items-center gap-2 border-b border-sidebar-border px-3">
                    <RouterLink
                        to="/tablero-01"
                        aria-label="Nimat - Panel de gestión"
                        class="min-w-0 flex-1 overflow-hidden"
                        @click="isMobileOpen = false"
                    >
                        <span
                            class="block overflow-hidden transition-[width] duration-200"
                            :class="isCollapsed ? 'mx-auto h-10 w-10' : 'h-[50px] w-[146px]'"
                        >
                            <img
                                src="/nimat-logo.svg"
                                alt="Nimat — Materiales para la construcción"
                                class="h-[50px] w-[146px] max-w-none"
                                :class="isCollapsed ? 'translate-x-0.5' : ''"
                            >
                        </span>
                    </RouterLink>

                    <Button
                        variant="ghost"
                        size="icon"
                        class="lg:hidden"
                        aria-label="Cerrar navegación"
                        @click="isMobileOpen = false"
                    >
                        <X class="size-4" />
                    </Button>
                </div>

                <nav class="flex-1 overflow-y-auto px-2 py-4" aria-label="Navegación principal">
                    <div
                        v-for="(group, groupIndex) in navigationGroups"
                        :key="group.label"
                        :class="groupIndex ? 'mt-5' : ''"
                    >
                        <p
                            v-if="!isCollapsed"
                            class="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                        >
                            {{ group.label }}
                        </p>
                        <Separator v-else-if="groupIndex" class="mx-auto mb-3 w-8" />

                        <div class="space-y-1">
                            <RouterLink
                                v-for="item in group.items"
                                :key="item.href"
                                :to="item.href"
                                class="flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                :class="[
                                    isCollapsed ? 'lg:justify-center lg:px-0' : '',
                                    isNavigationActive(item)
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-muted-foreground',
                                ]"
                                :title="isCollapsed ? item.label : undefined"
                                @click="selectNavigation(item.section)"
                            >
                                <component :is="item.icon" class="size-4 shrink-0" />
                                <span v-if="!isCollapsed">{{ item.label }}</span>
                            </RouterLink>
                        </div>
                    </div>

                </nav>

                <footer class="border-t border-sidebar-border px-3 py-3 text-muted-foreground">
                    <p class="text-center text-[11px] leading-relaxed lg:hidden">
                        © 2026 TIyC · Prades S.A.
                    </p>
                    <p v-if="!isCollapsed" class="hidden text-center text-[11px] leading-relaxed lg:block">
                        © 2026 TIyC · Prades S.A.
                    </p>
                    <div v-else class="group relative hidden justify-center lg:flex">
                        <span
                            tabindex="0"
                            aria-label="© 2026 TIyC · Prades S.A."
                            class="flex size-8 cursor-default items-center justify-center rounded-md text-xs font-medium outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                        >
                            ©
                        </span>
                        <span
                            role="tooltip"
                            class="pointer-events-none absolute bottom-0 left-full z-50 ml-2 w-max max-w-56 rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                            © 2026 TIyC · Prades S.A.
                        </span>
                    </div>
                </footer>

            </div>

        </aside>

        <div
            class="min-h-screen transition-[padding] duration-200 ease-out lg:p-2 lg:pl-0"
            :class="isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'"
        >
            <div class="min-h-screen overflow-hidden bg-background lg:min-h-[calc(100vh-1rem)] lg:rounded-xl lg:border lg:shadow-sm">
                <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
                    <Button
                        variant="ghost"
                        size="icon"
                        class="lg:hidden"
                        aria-label="Abrir navegación"
                        @click="isMobileOpen = true"
                    >
                        <Menu class="size-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        class="hidden lg:inline-flex"
                        :aria-label="isCollapsed ? 'Expandir navegación' : 'Contraer navegación'"
                        :title="isCollapsed ? 'Expandir navegación' : 'Contraer navegación'"
                        @click="isCollapsed = !isCollapsed"
                    >
                        <PanelLeft class="size-4" />
                    </Button>
                    <Separator orientation="vertical" class="h-4" />

                    <Button
                        as-child
                        variant="ghost"
                        size="icon"
                        aria-label="Inicio"
                        title="Inicio"
                    >
                        <RouterLink to="/tablero-01">
                            <House class="size-4" />
                        </RouterLink>
                    </Button>

                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 text-sm">
                            <span class="hidden text-muted-foreground sm:inline">Gestión financiera</span>
                            <span class="hidden text-muted-foreground sm:inline">/</span>
                            <span class="truncate font-medium">{{ props.pageTitle }}</span>
                        </div>
                    </div>

                    <nav class="flex items-center gap-1" aria-label="Opciones de usuario">
                        <Button
                            as-child
                            variant="ghost"
                            size="sm"
                            title="Mi cuenta"
                            aria-label="Mi cuenta"
                            :class="router.currentRoute.value.name === 'mi-cuenta' ? 'bg-accent' : ''"
                        >
                            <RouterLink to="/mi-cuenta">
                                <UserRound class="size-4" />
                            </RouterLink>
                        </Button>
                        <Button
                            v-if="hasPermission('gestion.configurar')"
                            as-child
                            variant="ghost"
                            size="sm"
                            title="Configuración general"
                            aria-label="Configuración general"
                            :class="router.currentRoute.value.name === 'configuracion-general' ? 'bg-accent' : ''"
                        >
                            <RouterLink to="/configuracion-general">
                                <Settings class="size-4" />
                            </RouterLink>
                        </Button>
                        <Button
                            v-if="hasPermission('gestion.administrar_usuarios')"
                            as-child
                            variant="ghost"
                            size="sm"
                            title="Administración de usuarios"
                            aria-label="Administración de usuarios"
                            :class="router.currentRoute.value.name === 'administracion-usuarios' ? 'bg-accent' : ''"
                        >
                            <RouterLink to="/administracion-usuarios">
                                <UsersRound class="size-4" />
                            </RouterLink>
                        </Button>
                    </nav>

                    <div class="hidden min-w-0 items-center gap-2 xl:flex">
                        <img
                            :src="authUser?.avatarUrl || '/nimat-avatar.png'"
                            :alt="`Avatar de ${authUser?.name || authUser?.username || 'usuario'}`"
                            class="size-8 shrink-0 rounded-full object-cover"
                        >
                        <span class="hidden max-w-40 truncate text-sm text-muted-foreground 2xl:inline">
                            {{ authUser?.displayName || authUser?.username || 'Usuario' }}
                        </span>
                    </div>

                    <Separator orientation="vertical" class="hidden h-4 sm:block" />
                    <GestionAlertsMenu
                        :alerts="displayedAlerts"
                        :is-loading="isAlertsLoading"
                        :error="alertsError"
                    />
                    <GestionFullscreenToggle />
                    <GestionThemeToggle compact />
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cerrar sesión"
                        title="Cerrar sesión"
                        @click="closeSession"
                    >
                        <LogOut class="size-4" />
                    </Button>
                </header>

                <main class="w-full space-y-4 p-4 sm:p-5 lg:p-6">
                    <slot />
                </main>
            </div>
        </div>
    </div>
</template>
