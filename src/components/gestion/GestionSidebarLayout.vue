<script setup lang="ts">
import { ref } from 'vue'
import {
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LineChart,
    LogOut,
    Menu,
    TableProperties,
    X,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import GestionThemeToggle from '@/components/gestion/GestionThemeToggle.vue'
import GestionAlertsMenu from '@/components/gestion/GestionAlertsMenu.vue'
import GestionFullscreenToggle from '@/components/gestion/GestionFullscreenToggle.vue'
import { Button } from '@/components/ui/button'
import { useGestionSectionNavigation } from '@/composables/useGestionSectionNavigation'
import { authUser, logout } from '@/services/auth'

withDefaults(defineProps<{
    alerts?: Array<{ title: string; description: string; type?: string }>
}>(), {
    alerts: () => [],
})

const isCollapsed = ref(false)
const isMobileOpen = ref(false)
const router = useRouter()
const { activeSection, navigateToSection } = useGestionSectionNavigation()

const navigation = [
    { label: 'Resumen', href: '#resumen', icon: LayoutDashboard },
    { label: 'Proyección', href: '#proyeccion', icon: CalendarRange },
    { label: 'Tendencias', href: '#tendencias', icon: LineChart },
    { label: 'Detalle', href: '#detalle', icon: TableProperties },
]

function closeMobileMenu() {
    isMobileOpen.value = false
}

function selectNavigation(href: string) {
    navigateToSection(href)
    closeMobileMenu()
}

function closeSession() {
    logout()
    void router.replace('/login')
}
</script>

<template>
    <div class="min-h-screen bg-muted/30">
        <header
            class="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden"
        >
            <RouterLink to="/tablero-01" aria-label="Nimat - Inicio" @click="closeMobileMenu">
                <img
                    src="/nimat-logo.svg"
                    alt="Nimat — Materiales para la construcción"
                    class="h-11 w-auto"
                >
            </RouterLink>

            <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir navegación"
                @click="isMobileOpen = true"
            >
                <Menu class="size-5" />
            </Button>
        </header>

        <button
            v-if="isMobileOpen"
            class="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            aria-label="Cerrar navegación"
            @click="closeMobileMenu"
        />

        <aside
            class="fixed inset-y-0 left-0 z-50 flex border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-[width,transform] duration-200 ease-out"
            :class="[
                isCollapsed ? 'lg:w-[76px]' : 'lg:w-60',
                isMobileOpen ? 'w-60 translate-x-0' : 'w-60 -translate-x-full lg:translate-x-0',
            ]"
        >
            <div class="flex min-w-0 flex-1 flex-col">
                <div class="flex h-20 items-center border-b border-sidebar-border px-4">
                    <RouterLink
                        to="/tablero-01"
                        aria-label="Nimat - Inicio"
                        class="min-w-0 flex-1 overflow-hidden"
                        @click="closeMobileMenu"
                    >
                        <span
                            class="block overflow-hidden transition-[width] duration-200"
                            :class="isCollapsed ? 'h-11 w-11' : 'h-[59px] w-[172px]'"
                        >
                            <img
                                src="/nimat-logo.svg"
                                alt="Nimat — Materiales para la construcción"
                                class="h-[59px] w-[172px] max-w-none"
                            >
                        </span>
                    </RouterLink>

                    <Button
                        variant="ghost"
                        size="icon"
                        class="lg:hidden"
                        aria-label="Cerrar navegación"
                        @click="closeMobileMenu"
                    >
                        <X class="size-4" />
                    </Button>
                </div>

                <nav class="flex-1 space-y-1.5 p-3" aria-label="Navegación principal">
                    <p
                        v-if="!isCollapsed"
                        class="px-3 pb-2 pt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                        Tablero
                    </p>

                    <a
                        v-for="item in navigation"
                        :key="item.href"
                        :href="item.href"
                        class="group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        :class="[
                            isCollapsed ? 'lg:justify-center lg:px-0' : '',
                            activeSection === item.href
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                : 'text-muted-foreground',
                        ]"
                        :title="isCollapsed ? item.label : undefined"
                        @click="selectNavigation(item.href)"
                    >
                        <component :is="item.icon" class="size-[18px] shrink-0" />
                        <span v-if="!isCollapsed">{{ item.label }}</span>
                    </a>
                </nav>

                <div class="space-y-3 border-t border-sidebar-border p-3">
                    <div
                        v-if="!isCollapsed"
                        class="flex items-center gap-2 rounded-lg border border-sidebar-border bg-background/60 p-2"
                    >
                        <img
                            v-if="authUser?.avatarUrl"
                            :src="authUser.avatarUrl"
                            :alt="`Avatar de ${authUser.name || authUser.username}`"
                            class="size-8 shrink-0 rounded-full object-cover"
                        >
                        <div class="min-w-0 flex-1 px-1">
                            <p class="truncate text-xs font-medium">{{ authUser?.displayName || authUser?.username || 'Usuario' }}</p>
                            <p class="truncate text-[11px] text-muted-foreground">{{ authUser?.email || 'Sesión activa' }}</p>
                        </div>
                        <Button variant="ghost" size="icon" class="size-8 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Cerrar sesión" title="Cerrar sesión" @click="closeSession">
                            <LogOut class="size-4" />
                        </Button>
                    </div>

                    <div v-if="!isCollapsed" class="flex items-center gap-2">
                        <div class="min-w-0 flex-1 [&_button]:w-full [&_button]:justify-start">
                            <GestionThemeToggle />
                        </div>
                        <GestionFullscreenToggle />
                        <GestionAlertsMenu :alerts="alerts" side="right" />
                    </div>
                    <div v-else class="hidden flex-col items-center gap-2 lg:flex">
                        <img
                            :src="authUser?.avatarUrl || '/nimat-avatar.png'"
                            :alt="`Avatar de ${authUser?.name || authUser?.username || 'usuario'}`"
                            :title="authUser?.displayName || authUser?.username || 'Usuario'"
                            class="size-9 rounded-full border border-sidebar-border object-cover shadow-sm ring-2 ring-background"
                        >
                        <Button
                            variant="outline"
                            size="icon"
                            class="text-muted-foreground hover:text-destructive"
                            aria-label="Cerrar sesión"
                            title="Cerrar sesión"
                            @click="closeSession"
                        >
                            <LogOut class="size-4" />
                        </Button>
                        <GestionThemeToggle compact />
                        <GestionFullscreenToggle />
                        <GestionAlertsMenu :alerts="alerts" side="right" />
                    </div>

                    <div v-if="!isCollapsed" class="rounded-lg bg-sidebar-accent/70 px-3 py-2.5">
                        <p class="text-xs font-medium">Información consolidada</p>
                        <p class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Indicadores financieros para decisiones semanales.
                        </p>
                    </div>
                </div>
            </div>

            <Button
                variant="outline"
                size="icon"
                class="absolute -right-3 top-24 hidden size-6 rounded-full bg-background shadow-sm lg:inline-flex"
                :aria-label="isCollapsed ? 'Expandir navegación' : 'Contraer navegación'"
                :title="isCollapsed ? 'Expandir navegación' : 'Contraer navegación'"
                @click="isCollapsed = !isCollapsed"
            >
                <ChevronRight v-if="isCollapsed" class="size-3.5" />
                <ChevronLeft v-else class="size-3.5" />
            </Button>
        </aside>

        <div
            class="transition-[padding] duration-200 ease-out"
            :class="isCollapsed ? 'lg:pl-[76px]' : 'lg:pl-60'"
        >
            <main class="w-full space-y-4 p-4 sm:p-5 lg:p-6">
                <slot />
            </main>
        </div>
    </div>
</template>
