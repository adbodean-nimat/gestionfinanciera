<script setup lang="ts">
import { AlertTriangle, CircleCheck, Loader2 } from 'lucide-vue-next'
import {
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger,
} from 'reka-ui'

import { Button } from '@/components/ui/button'

type DashboardAlert = {
    title: string
    description: string
    type?: string
}

withDefaults(defineProps<{
    alerts?: readonly DashboardAlert[]
    isLoading?: boolean
    error?: string | null
    side?: 'top' | 'right' | 'bottom' | 'left'
}>(), {
    alerts: () => [],
    isLoading: false,
    error: null,
    side: 'bottom',
})
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
            <Button
                variant="ghost"
                size="icon"
                class="relative shrink-0"
                :class="alerts.length ? 'border-amber-500/40 text-amber-600 dark:text-amber-400' : 'text-muted-foreground'"
                :aria-label="isLoading ? 'Actualizando alertas' : alerts.length ? `Ver ${alerts.length} alertas` : error ? 'No se pudieron consultar las alertas' : 'Sin alertas activas'"
                :title="isLoading ? 'Actualizando alertas' : alerts.length ? `Ver ${alerts.length} alertas` : error ? 'No se pudieron consultar las alertas' : 'Sin alertas activas'"
            >
                <Loader2 v-if="isLoading" class="size-4 animate-spin" />
                <AlertTriangle v-else class="size-4" />
                <span
                    v-if="alerts.length"
                    aria-hidden="true"
                    class="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground shadow-sm ring-2 ring-background"
                >
                    {{ alerts.length }}
                </span>
            </Button>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
            <DropdownMenuContent
                :side="side"
                align="end"
                :side-offset="8"
                class="z-50 max-h-[min(28rem,80vh)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg outline-none"
            >
                <DropdownMenuLabel class="px-3 py-2">
                    <p class="text-sm font-semibold">Alertas del tablero</p>
                    <p class="text-xs font-normal text-muted-foreground">
                        {{ isLoading ? 'Actualizando indicadores financieros…' : error ? 'No fue posible actualizar los indicadores' : alerts.length ? `${alerts.length} advertencia${alerts.length === 1 ? '' : 's'} activa${alerts.length === 1 ? '' : 's'}` : 'No hay advertencias activas' }}
                    </p>
                </DropdownMenuLabel>

                <div v-if="isLoading" class="flex items-center gap-2 border-t px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 class="size-4 animate-spin" />
                    Consultando Gestión Financiera…
                </div>

                <div v-else-if="error" class="flex gap-2 border-t px-3 py-3 text-sm text-muted-foreground">
                    <AlertTriangle class="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>{{ error }}</span>
                </div>

                <div v-else-if="alerts.length" class="space-y-1 border-t p-1 pt-2">
                    <div
                        v-for="alert in alerts"
                        :key="alert.title"
                        class="flex gap-2.5 rounded-md px-2 py-2.5"
                    >
                        <AlertTriangle class="mt-0.5 size-4 shrink-0 text-destructive" />
                        <div class="min-w-0">
                            <p class="text-sm font-medium leading-snug">{{ alert.title }}</p>
                            <p class="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {{ alert.description }}
                            </p>
                        </div>
                    </div>
                </div>

                <div v-else class="flex items-center gap-2 border-t px-3 py-3 text-sm text-muted-foreground">
                    <CircleCheck class="size-4 text-emerald-600" />
                    Todos los indicadores están dentro de los parámetros.
                </div>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenuRoot>
</template>
