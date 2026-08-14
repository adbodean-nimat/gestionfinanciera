<script setup lang="ts">
import { computed, ref } from 'vue'
import {
    Calculator,
    Check,
    Info,
    Moon,
    Palette,
    Save,
    Settings,
    Sun,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import GestionDashboard01Layout from '@/components/gestion/GestionDashboard01Layout.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { type Theme, useTheme } from '@/composables/useTheme'

const CMV_CONFIG_STORAGE_KEY = 'gestion-finanzas:cmv-config'
const defaultCmvConfig = {
    porcentaje: 75.15,
    diasLaborales: 5.5,
}

const appVersion = import.meta.env.VITE_APP_VERSION ?? '1.0.0'
const { theme, setTheme } = useTheme()
const porcentajeDraft = ref(String(loadCmvConfig().porcentaje))
const diasLaboralesDraft = ref(String(loadCmvConfig().diasLaborales))
const validationError = ref<string | null>(null)

const appearanceOptions: Array<{
    value: Theme
    label: string
    description: string
    icon: typeof Sun
}> = [
    {
        value: 'light',
        label: 'Claro',
        description: 'Mayor luminosidad y contraste sobre fondos blancos.',
        icon: Sun,
    },
    {
        value: 'dark',
        label: 'Oscuro',
        description: 'Menor brillo para trabajar en ambientes con poca luz.',
        icon: Moon,
    },
]

const formulaPreview = computed(() => {
    const percentage = Number(porcentajeDraft.value)
    const workdays = Number(diasLaboralesDraft.value)

    if (!Number.isFinite(percentage) || !Number.isFinite(workdays) || workdays === 0) {
        return 'Completá ambos valores para visualizar la fórmula.'
    }

    return `(Ventas netas × ${percentage.toLocaleString('es-AR')}%) / ${workdays.toLocaleString('es-AR')} días`
})

function loadCmvConfig() {
    if (typeof window === 'undefined') return defaultCmvConfig

    try {
        const stored = JSON.parse(
            window.localStorage.getItem(CMV_CONFIG_STORAGE_KEY) ?? 'null'
        )
        const porcentaje = Number(stored?.porcentaje)
        const diasLaborales = Number(stored?.diasLaborales)

        if (
            Number.isFinite(porcentaje)
            && porcentaje > 0
            && porcentaje <= 100
            && Number.isFinite(diasLaborales)
            && diasLaborales > 0
            && diasLaborales <= 7
        ) {
            return { porcentaje, diasLaborales }
        }
    } catch {
        // Se usan los valores iniciales cuando la configuración guardada no es válida.
    }

    return defaultCmvConfig
}

function selectTheme(nextTheme: Theme) {
    if (theme.value === nextTheme) return

    setTheme(nextTheme)
    toast.success(`Tema ${nextTheme === 'light' ? 'claro' : 'oscuro'} activado.`)
}

function saveCalculationSettings() {
    const porcentaje = Number(porcentajeDraft.value)
    const diasLaborales = Number(diasLaboralesDraft.value)

    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        validationError.value = 'El porcentaje debe ser mayor que 0 y menor o igual que 100.'
        return
    }

    if (!Number.isFinite(diasLaborales) || diasLaborales <= 0 || diasLaborales > 7) {
        validationError.value = 'Los días laborables deben ser mayores que 0 y menores o iguales que 7.'
        return
    }

    try {
        window.localStorage.setItem(
            CMV_CONFIG_STORAGE_KEY,
            JSON.stringify({ porcentaje, diasLaborales })
        )
    } catch {
        toast.error('No se pudo guardar la configuración en este navegador.')
        return
    }

    validationError.value = null
    toast.success('Configuración de cálculo guardada.')
}
</script>

<template>
    <GestionDashboard01Layout page-title="Configuración general">
        <section class="mx-auto w-full max-w-5xl space-y-6" aria-labelledby="settings-title">
            <div>
                <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Administración
                </p>
                <h1 id="settings-title" class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Configuración general
                </h1>
                <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Personalizá la aplicación y definí los parámetros que se utilizan en los cálculos del tablero.
                </p>
            </div>

            <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <nav class="h-fit rounded-xl border bg-card p-2" aria-label="Secciones de configuración">
                    <a
                        href="#aplicacion"
                        class="flex items-center gap-3 rounded-lg bg-emerald-600/10 px-3 py-2.5 text-sm font-medium text-emerald-800 dark:text-emerald-300"
                    >
                        <Settings class="size-4" />
                        Aplicación
                    </a>
                    <a
                        href="#calculos"
                        class="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <Calculator class="size-4" />
                        Cálculos
                    </a>
                </nav>

                <div class="min-w-0 space-y-6">
                    <Card id="aplicacion" class="scroll-mt-20">
                        <CardHeader>
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle>Aplicación</CardTitle>
                                    <CardDescription class="mt-1.5">
                                        Información general y preferencias visuales.
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary">V.{{ appVersion }}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                                <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                                    <Info class="size-4" />
                                </span>
                                <div class="min-w-0">
                                    <p class="font-medium">Panel de Gestión Financiera</p>
                                    <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        Información financiera consolidada para el seguimiento y la toma de decisiones.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <div class="mb-3 flex items-center gap-2">
                                    <Palette class="size-4 text-muted-foreground" />
                                    <h2 class="text-sm font-medium">Apariencia</h2>
                                </div>
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <button
                                        v-for="option in appearanceOptions"
                                        :key="option.value"
                                        type="button"
                                        class="relative flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        :class="theme === option.value ? 'border-emerald-600 bg-emerald-600/5' : ''"
                                        :aria-pressed="theme === option.value"
                                        @click="selectTheme(option.value)"
                                    >
                                        <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                                            <component :is="option.icon" class="size-4" />
                                        </span>
                                        <span>
                                            <span class="block text-sm font-medium">{{ option.label }}</span>
                                            <span class="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                                {{ option.description }}
                                            </span>
                                        </span>
                                        <Check
                                            v-if="theme === option.value"
                                            class="absolute right-3 top-3 size-4 text-emerald-700 dark:text-emerald-400"
                                        />
                                    </button>
                                </div>
                                <p class="mt-3 text-xs text-muted-foreground">
                                    La preferencia se guarda automáticamente en este navegador.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card id="calculos" class="scroll-mt-20">
                        <CardHeader>
                            <CardTitle>Parámetros de cálculo</CardTitle>
                            <CardDescription>
                                Valores globales aplicados al cálculo de CMV por día en todo el tablero.
                            </CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-6">
                            <div class="grid gap-5 sm:grid-cols-2">
                                <div class="space-y-2">
                                    <Label for="settings-cmv-percentage">Porcentaje de ventas netas</Label>
                                    <div class="relative">
                                        <Input
                                            id="settings-cmv-percentage"
                                            v-model="porcentajeDraft"
                                            type="number"
                                            min="0.01"
                                            max="100"
                                            step="0.01"
                                            class="pr-9"
                                            @input="validationError = null"
                                        />
                                        <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
                                    </div>
                                    <p class="text-xs text-muted-foreground">Valor inicial: 75,15%.</p>
                                </div>

                                <div class="space-y-2">
                                    <Label for="settings-workdays">Días laborables</Label>
                                    <Input
                                        id="settings-workdays"
                                        v-model="diasLaboralesDraft"
                                        type="number"
                                        min="0.5"
                                        max="7"
                                        step="0.5"
                                        @input="validationError = null"
                                    />
                                    <p class="text-xs text-muted-foreground">Valor inicial: 5,5 días.</p>
                                </div>
                            </div>

                            <div class="rounded-lg border bg-muted/40 p-4">
                                <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Fórmula aplicada
                                </p>
                                <p class="mt-1.5 text-sm font-medium">{{ formulaPreview }}</p>
                            </div>

                            <p
                                v-if="validationError"
                                role="alert"
                                class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                            >
                                {{ validationError }}
                            </p>

                            <div class="flex justify-end">
                                <Button @click="saveCalculationSettings">
                                    <Save class="mr-2 size-4" />
                                    Guardar cambios
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    </GestionDashboard01Layout>
</template>
