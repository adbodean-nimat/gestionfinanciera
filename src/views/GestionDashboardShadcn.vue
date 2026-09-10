<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, Database, Loader2, RefreshCcw } from 'lucide-vue-next'

import GestionCmvConfigDrawer from '@/components/gestion/GestionCmvConfigDrawer.vue'
import GestionDataDrawer from '@/components/gestion/GestionDataDrawer.vue'
import GestionDashboard01Layout from '@/components/gestion/GestionDashboard01Layout.vue'
import GestionSidebarLayout from '@/components/gestion/GestionSidebarLayout.vue'
import { useGestionListado } from '@/composables/useGestion'
import {
    mapLegacyMockRow,
    mapGestionListadoToDashboard,
    mapGestionRegistroToDashboard,
} from '@/mappers/gestion.mapper'
import type { GestionDashboard } from '@/mappers/gestion.mapper'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import {
    ChartContainer,
    ChartCrosshair,
    ChartTooltip,
    ChartTooltipContent,
    componentToString,
} from '@/components/ui/chart'

import type { ChartConfig } from '@/components/ui/chart'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert'

import {
    VisXYContainer,
    VisLine,
    VisStackedBar,
    VisAxis,
    VisBulletLegend,
} from '@unovis/vue'

import { formatCurrency, formatNumber } from '@/lib/formatters'
import { buildGestionAlerts } from '@/lib/gestionAlerts'
import { setGestionAlerts } from '@/composables/useGestionAlerts'
import { hasPermission } from '@/services/auth'

const props = withDefaults(defineProps<{
    layout?: 'classic' | 'dashboard-01'
}>(), {
    layout: 'classic',
})

const DashboardLayout = computed(() =>
    props.layout === 'dashboard-01'
        ? GestionDashboard01Layout
        : GestionSidebarLayout
)

const selectedRange = ref<'6' | '12' | '24' | '52'>('6')
const isResumenDetalleOpen = ref(false)
const isOtrosDatosOpen = ref(false)

const CMV_CONFIG_STORAGE_KEY = 'gestion-finanzas:cmv-config'
const defaultCmvConfig = {
    porcentaje: 75.15,
    diasLaborales: 5.5,
}

function loadCmvConfig() {
    if (typeof window === 'undefined') return defaultCmvConfig

    try {
        const stored = JSON.parse(
            window.localStorage.getItem(CMV_CONFIG_STORAGE_KEY) ?? 'null'
        )
        const porcentaje = Number(stored?.porcentaje)
        const diasLaborales = Number(stored?.diasLaborales)

        if (
            Number.isFinite(porcentaje) &&
            porcentaje > 0 &&
            porcentaje <= 100 &&
            Number.isFinite(diasLaborales) &&
            diasLaborales > 0 &&
            diasLaborales <= 7
        ) {
            return { porcentaje, diasLaborales }
        }
    } catch {
        // Si la configuración local no es válida se usan los valores iniciales.
    }

    return defaultCmvConfig
}

const cmvConfig = ref(loadCmvConfig())
const canConfigureCmv = computed(() =>
    hasPermission('gestion.editar') || hasPermission('gestion.configurar')
)

function saveCmvConfig(config: { porcentaje: number; diasLaborales: number }) {
    if (!canConfigureCmv.value) return

    cmvConfig.value = config

    try {
        window.localStorage.setItem(
            CMV_CONFIG_STORAGE_KEY,
            JSON.stringify(config)
        )
    } catch {
        // El cálculo sigue funcionando aunque el navegador bloquee el guardado local.
    }
}

const dashboardData = ref<GestionDashboard[]>([])
const dataSource = ref<'api' | 'mock'>('api')
const canUseMockFallback = import.meta.env.DEV

const {
    registros,
    isLoading: isHistoryLoading,
    error: historyError,
    load: loadGestionListado,
} = useGestionListado()

async function loadDashboard() {
    await loadGestionListado()

    if (!historyError.value) {
        dashboardData.value = mapGestionListadoToDashboard(registros.value)
        dataSource.value = 'api'
        setGestionAlerts(criticalAlerts.value)
    }
}

async function useMockFallback() {
    if (!canUseMockFallback) return

    const { gestionMock } = await import('@/data/gestion.mock')
    dashboardData.value = gestionMock.map(mapLegacyMockRow).map(
        mapGestionRegistroToDashboard
    )
    dataSource.value = 'mock'
    setGestionAlerts(criticalAlerts.value)
}

const filteredData = computed(() => {
    return dashboardData.value.slice(Number(selectedRange.value) * -1)
})

const latest = computed(() => {
    return filteredData.value[filteredData.value.length - 1]
})

const previous = computed(() => {
    return filteredData.value[filteredData.value.length - 2]
})

async function handleGestionSaved() {
    await loadDashboard()
}

onMounted(loadDashboard)

const chartColors = {
    disponibilidades: '#2563eb',
    totalPasivos: '#dc2626',
    cobranzasProyectadas: '#16a34a',
    compromisosProyectados: '#f97316',

    caja: '#2563eb',
    bancos: '#16a34a',
    valores: '#f97316',
    fondosFci: '#7c3aed',
}

const flujoChartConfig = {
    totalDisponibilidades: {
        label: 'Disponibilidades',
        color: chartColors.disponibilidades,
    },
    totalPasivos: {
        label: 'Total pasivos',
        color: chartColors.totalPasivos,
    },
} satisfies ChartConfig

const composicionChartConfig = {
    caja: {
        label: 'Caja',
        color: chartColors.caja,
    },
    bancos: {
        label: 'Bancos',
        color: chartColors.bancos,
    },
    valores: {
        label: 'Valores',
        color: chartColors.valores,
    },
    fondosFci: {
        label: 'Fondos',
        color: chartColors.fondosFci,
    },
} satisfies ChartConfig

const proyeccionesChartConfig = {
    cobranzasProyectadas: {
        label: 'Cobranzas proyectadas',
        color: chartColors.cobranzasProyectadas,
    },
    compromisosProyectados: {
        label: 'Obligaciones proyectadas',
        color: chartColors.compromisosProyectados,
    },
} satisfies ChartConfig

const legendFlujoProyectado = [
    { name: 'Disponibilidades', color: chartColors.disponibilidades },
    { name: 'Total pasivos', color: chartColors.totalPasivos },
]

const legendCajaBancosValoresFci = [
    { name: 'Caja', color: chartColors.caja },
    { name: 'Bancos', color: chartColors.bancos },
    { name: 'Valores', color: chartColors.valores },
    { name: 'Fondos', color: chartColors.fondosFci },
]

const hayProyecciones = computed(() =>
    filteredData.value.some(
        (item) =>
            (item.cobranzasProyectadas !== null &&
                item.cobranzasProyectadas !== undefined) ||
            (item.compromisosProyectados !== null &&
                item.compromisosProyectados !== undefined)
    )
)

const legendProyecciones = [
    { name: 'Cobranzas proyectadas', color: chartColors.cobranzasProyectadas },
    {
        name: 'Obligaciones proyectadas',
        color: chartColors.compromisosProyectados,
    },
]

const x = (_: GestionDashboard, index: number) => index

const yDisponibilidades = (d: GestionDashboard) => d.totalDisponibilidades
const yTotalPasivos = (d: GestionDashboard) => d.totalPasivos
const yCobranzasProyectadas = (d: GestionDashboard) => d.cobranzasProyectadas
const yCompromisosProyectados = (d: GestionDashboard) =>
    d.compromisosProyectados

const yCaja = (d: GestionDashboard) => d.cajaFinal
const yBancos = (d: GestionDashboard) => d.bancos
const yValores = (d: GestionDashboard) => d.valores
const yFondos = (d: GestionDashboard) => d.fondosFci

const calcularCmvPorDia = (ventasNetas: number | null | undefined) =>
    ventasNetas === null || ventasNetas === undefined
        ? null
        : (ventasNetas * (cmvConfig.value.porcentaje / 100)) /
          cmvConfig.value.diasLaborales

const yCajaBancosValoresFci = [yCaja, yBancos, yValores, yFondos]

function getXAxisLabel(value: number | Date) {
    if (value instanceof Date) {
        return ''
    }

    return filteredData.value[value]?.semana ?? ''
}

function getDayXAxisLabel(value: number | Date) {
    if (value instanceof Date) {
        return ''
    }

    const fecha = filteredData.value[value]?.fecha
    if (!fecha) return ''

    return formatDate(fecha).slice(0, 5)
}

function currencyTooltip(value: number) {
    return formatCurrency(value)
}

function formatDate(fecha: string) {
    const value = new Date(`${fecha}T00:00:00Z`)

    if (Number.isNaN(value.getTime())) return fecha

    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(value)
}

type ComparisonTone = 'positive' | 'negative' | 'neutral'
type ComparisonDirection = 'higher' | 'lower' | 'neutral'
type CardComparison = {
    text: string
    tone: ComparisonTone
}

function comparisonTone(
    change: number,
    direction: ComparisonDirection
): ComparisonTone {
    if (change === 0 || direction === 'neutral') return 'neutral'

    const isFavorable =
        direction === 'higher' ? change > 0 : change < 0

    return isFavorable ? 'positive' : 'negative'
}

function buildPercentComparison(
    current: number | null | undefined,
    prior: number | null | undefined,
    direction: ComparisonDirection
): CardComparison | null {
    if (
        current === null ||
        current === undefined ||
        prior === null ||
        prior === undefined ||
        prior === 0
    ) {
        return null
    }

    const change = ((current - prior) / Math.abs(prior)) * 100

    if (change === 0) return null

    return {
        text: `${change > 0 ? '+' : ''}${formatNumber(change)}%`,
        tone: comparisonTone(change, direction),
    }
}

function buildCurrencyComparison(
    current: number | null | undefined,
    prior: number | null | undefined,
    direction: ComparisonDirection
): CardComparison | null {
    if (
        current === null ||
        current === undefined ||
        prior === null ||
        prior === undefined
    ) {
        return null
    }

    const change = current - prior

    if (change === 0) return null

    return {
        text: `${change > 0 ? '+' : ''}${formatCurrency(change)}`,
        tone: comparisonTone(change, direction),
    }
}

function buildDaysComparison(
    current: number | null | undefined,
    prior: number | null | undefined,
    direction: ComparisonDirection
): CardComparison | null {
    if (
        current === null ||
        current === undefined ||
        prior === null ||
        prior === undefined
    ) {
        return null
    }

    const change = current - prior

    if (change === 0) return null

    return {
        text: `${change > 0 ? '+' : ''}${formatNumber(change)} días`,
        tone: comparisonTone(change, direction),
    }
}

function comparisonBadgeClass(comparison: CardComparison) {
    if (comparison.tone === 'positive') {
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
    }

    return comparison.tone === 'neutral'
        ? 'bg-muted text-muted-foreground hover:bg-muted'
        : ''
}

const resumenDelDia = computed(() => {
    const current = latest.value
    const prior = previous.value

    if (!current) return []

    return [
        {
            title: 'Disponibilidades',
            value: formatCurrency(current.totalDisponibilidades),
            description: 'Caja + Bancos + Valores + Fondos',
            comparison: buildPercentComparison(
                current.totalDisponibilidades,
                prior?.totalDisponibilidades,
                'higher'
            ),
        },
        {
            title: 'Fondos',
            value: formatCurrency(current.fondosFci),
            description: 'Fondos comunes de inversión',
            comparison: buildPercentComparison(
                current.fondosFci,
                prior?.fondosFci,
                'higher'
            ),
        },
    ]
})

const pasivosDelDia = computed(() => {
    const current = latest.value
    const prior = previous.value

    if (!current) return []

    return [
        {
            title: 'Proveedores actual',
            value: formatCurrency(current.proveedores),
            description: 'Proveedores actuales cargados',
            comparison: buildPercentComparison(
                current.proveedores,
                prior?.proveedores,
                'lower'
            ),
        },
        {
            title: 'Otros pagos / Impuestos actual',
            value: formatCurrency(current.opvOtros),
            description: 'Otros actuales cargados en planilla',
            comparison: buildCurrencyComparison(
                current.opvOtros,
                prior?.opvOtros,
                'lower'
            ),
        },
        {
            title: 'Total pasivos',
            value: formatCurrency(current.totalPasivos),
            description: 'Pasivos actuales cargados',
            comparison: buildPercentComparison(
                current.totalPasivos,
                prior?.totalPasivos,
                'lower'
            ),
        },
    ]
})

const otrosDatosDelDia = computed(() => {
    const current = latest.value
    const prior = previous.value

    if (!current) return []

    const cmvPorDia = calcularCmvPorDia(current.ventasNetas)
    const cmvPorDiaAnterior = calcularCmvPorDia(prior?.ventasNetas)
    const perteneceAlMismoMes =
        prior !== undefined &&
        current.fecha.slice(0, 7) === prior.fecha.slice(0, 7)
    const diasStock =
        current.stockCostoReposicion === null ||
        cmvPorDia === null ||
        cmvPorDia === 0
            ? null
            : current.stockCostoReposicion / cmvPorDia
    const diasStockAnterior =
        prior?.stockCostoReposicion === null ||
        prior?.stockCostoReposicion === undefined ||
        cmvPorDiaAnterior === null ||
        cmvPorDiaAnterior === 0
            ? null
            : prior.stockCostoReposicion / cmvPorDiaAnterior

    return [
        {
            title: 'Stock a costo de reposición',
            value: formatCurrency(current.stockCostoReposicion),
            description: 'Valuación actual del inventario',
            comparison: buildPercentComparison(
                current.stockCostoReposicion,
                prior?.stockCostoReposicion,
                'neutral'
            ),
        },
        {
            title: 'Acopio actualizado al cierre del mes',
            value: formatCurrency(current.acopioCierreMes),
            description: 'Acopio acumulado al último cierre mensual',
            comparison: null,
        },
        {
            title: 'Acopio en el mes actual',
            value: formatCurrency(current.acopioMesActual),
            description: 'Movimiento acumulado del mes en curso',
            comparison: perteneceAlMismoMes
                ? buildCurrencyComparison(
                      current.acopioMesActual,
                      prior?.acopioMesActual,
                      'neutral'
                  )
                : null,
        },
        {
            title: 'Cuenta corriente clientes',
            value: formatCurrency(current.cuentaCorrienteClientes),
            description: 'Saldo actual de cuentas corrientes',
            comparison: buildPercentComparison(
                current.cuentaCorrienteClientes,
                prior?.cuentaCorrienteClientes,
                'lower'
            ),
        },
        {
            title: 'Anticipos proveedores',
            value: formatCurrency(current.anticipos),
            description: 'Anticipos a proveedores informados en la planilla',
            comparison: buildCurrencyComparison(
                current.anticipos,
                prior?.anticipos,
                'neutral'
            ),
        },
        {
            title: 'Acopios proveedores',
            value: formatCurrency(current.acopiosEspeciales),
            description: 'Lote Cert, Cormela y La Postrera sin IVA',
            comparison: buildCurrencyComparison(
                current.acopiosEspeciales,
                prior?.acopiosEspeciales,
                'neutral'
            ),
        },
        {
            title: 'Días de stock',
            value: diasStock === null ? '-' : formatNumber(diasStock),
            description: 'Stock a costo de reposición / CMV por día',
            comparison: buildDaysComparison(
                diasStock,
                diasStockAnterior,
                'lower'
            ),
        },
    ]
})

const proyeccionSemanal = computed(() => {
    const current = latest.value
    const prior = previous.value

    if (!current) return []

    return [
        {
            title: 'Cobranzas promedio',
            value: formatCurrency(current.cobranzas),
            description: 'Promedio informado por la planilla para la semana actual',
            comparison: buildPercentComparison(
                current.cobranzas,
                prior?.cobranzas,
                'higher'
            ),
        },
        {
            title: 'Proveedores a vencer',
            value: formatCurrency(current.proveedoresAVencerFinal),
            description: 'Vencimientos de la semana',
            comparison: buildPercentComparison(
                current.proveedoresAVencerFinal,
                prior?.proveedoresAVencerFinal,
                'lower'
            ),
        },
        {
            title: 'Otros pagos proyectados',
            value: formatCurrency(current.otrosPagosProyectados),
            description: 'Impuestos, sueldos u otros pagos previstos',
            comparison: buildPercentComparison(
                current.otrosPagosProyectados,
                prior?.otrosPagosProyectados,
                'lower'
            ),
        },
        {
            title: 'Ventas netas',
            value: formatCurrency(current.ventasNetas),
            description: 'Ventas netas de la semana actual',
            comparison: null,
        },
        {
            title: 'CMV por día',
            value: formatCurrency(calcularCmvPorDia(current.ventasNetas)),
            description:
                current.ventasNetas === null
                    ? 'Pendiente: ventas netas no disponible'
                    : `${formatNumber(cmvConfig.value.porcentaje)}% de ventas netas / ${formatNumber(cmvConfig.value.diasLaborales)} días`,
            comparison: buildPercentComparison(
                calcularCmvPorDia(current.ventasNetas),
                calcularCmvPorDia(prior?.ventasNetas),
                'neutral'
            ),
        },
    ]
})

const diasCajaComparison = computed(() =>
    buildDaysComparison(
        latest.value?.diasCaja,
        previous.value?.diasCaja,
        'higher'
    )
)

const criticalAlerts = computed(() => buildGestionAlerts(latest.value))

</script>

<template>
    <component :is="DashboardLayout" :alerts="criticalAlerts">
        <section id="resumen" class="scroll-mt-24 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 class="shrink-0 text-2xl font-semibold tracking-tight">
                    Panel de gestión financiera
                </h1>

                <div v-if="latest" class="flex flex-wrap items-baseline gap-x-3 text-sm text-muted-foreground">
                    <p class="whitespace-nowrap">Última fecha disponible: {{ formatDate(latest.fecha) }}</p>
                    <p class="whitespace-nowrap">Semana: {{ latest.semana }}</p>
                </div>

                <Badge v-if="dataSource === 'mock'" variant="secondary" class="self-center">
                    <Database class="mr-1 h-3 w-3" />
                    Datos simulados
                </Badge>
            </div>

            <div class="flex flex-wrap gap-2">
                <GestionDataDrawer
                    v-if="hasPermission('gestion.editar')"
                    @saved="handleGestionSaved"
                />
                <GestionCmvConfigDrawer
                    v-if="canConfigureCmv"
                    :porcentaje="cmvConfig.porcentaje"
                    :dias-laborales="cmvConfig.diasLaborales"
                    @save="saveCmvConfig"
                />
            </div>
        </section>

        <Alert v-if="isHistoryLoading && dashboardData.length === 0">
            <Loader2 class="h-4 w-4 animate-spin" />
            <AlertTitle>Cargando histórico</AlertTitle>
            <AlertDescription>
                Consultando los registros guardados del tablero.
            </AlertDescription>
        </Alert>

        <Alert v-if="historyError" variant="destructive">
            <AlertTitle>No se pudo cargar el histórico</AlertTitle>
            <AlertDescription class="space-y-3">
                <p>{{ historyError }}</p>
                <div class="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" @click="loadDashboard">
                        <RefreshCcw class="mr-2 h-4 w-4" />
                        Reintentar
                    </Button>
                    <Button
                        v-if="canUseMockFallback"
                        variant="secondary"
                        size="sm"
                        @click="useMockFallback"
                    >
                        <Database class="mr-2 h-4 w-4" />
                        Usar datos de ejemplo
                    </Button>
                </div>
            </AlertDescription>
        </Alert>

        <Card
            v-if="!isHistoryLoading && !historyError && dashboardData.length === 0"
            class="border-dashed"
        >
            <CardContent class="flex min-h-40 flex-col items-center justify-center text-center">
                <Database class="mb-3 h-8 w-8 text-muted-foreground" />
                <p class="font-medium">Todavía no hay registros guardados</p>
                <p class="mt-1 text-sm text-muted-foreground">
                    Usá “Cargar / actualizar datos” para crear la primera fecha.
                </p>
            </CardContent>
        </Card>

        <section v-if="dashboardData.length" class="space-y-3">
            <div class="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <h2 class="text-lg font-semibold tracking-tight">Resumen del día</h2>
                <p class="min-w-0 truncate text-sm text-muted-foreground" title="Posición actual correspondiente a la última fecha disponible.">
                    Posición actual correspondiente a la última fecha disponible.
                </p>
            </div>

            <div class="grid items-start gap-3 lg:grid-cols-4">
                <Card v-if="resumenDelDia[0]" class="gap-0 overflow-hidden py-0">
                    <CardContent class="px-4 py-1">
                        <div class="flex min-w-0 items-center justify-between gap-3">
                            <div class="min-w-0">
                                <CardDescription class="truncate font-semibold text-foreground">Disponibilidades</CardDescription>
                                <p class="text-xl font-semibold leading-tight tracking-tight">
                                    {{ resumenDelDia[0].value }}
                                </p>
                            </div>

                            <div
                                v-if="resumenDelDia[0].comparison"
                                class="flex shrink-0 flex-col items-end gap-0.5 text-right"
                            >
                                <Badge
                                    :variant="resumenDelDia[0].comparison.tone === 'negative' ? 'destructive' : 'secondary'"
                                    :class="comparisonBadgeClass(resumenDelDia[0].comparison)"
                                >
                                    {{ resumenDelDia[0].comparison.text }}
                                </Badge>
                                <span class="text-[10px] leading-none text-muted-foreground">vs sem. anterior</span>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Card v-if="pasivosDelDia[2]" class="gap-0 overflow-hidden py-0">
                    <CardContent class="px-4 py-1">
                        <div class="flex min-w-0 items-center justify-between gap-3">
                            <div class="min-w-0">
                                <CardDescription class="truncate font-semibold text-foreground">Total pasivos</CardDescription>
                                <p class="text-xl font-semibold leading-tight tracking-tight">
                                    {{ pasivosDelDia[2].value }}
                                </p>
                            </div>

                            <div
                                v-if="pasivosDelDia[2].comparison"
                                class="flex shrink-0 flex-col items-end gap-0.5 text-right"
                            >
                                <Badge
                                    :variant="pasivosDelDia[2].comparison.tone === 'negative' ? 'destructive' : 'secondary'"
                                    :class="comparisonBadgeClass(pasivosDelDia[2].comparison)"
                                >
                                    {{ pasivosDelDia[2].comparison.text }}
                                </Badge>
                                <span class="text-[10px] leading-none text-muted-foreground">vs sem. anterior</span>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <Card class="gap-2 py-1">
                    <CardContent class="flex min-w-0 items-center justify-between gap-3 px-4">
                        <div class="min-w-0">
                            <CardDescription class="font-semibold text-foreground">Días de caja</CardDescription>
                            <p class="text-xl font-semibold leading-tight tracking-tight">
                                {{ latest?.diasCaja === null || latest?.diasCaja === undefined ? '-' : formatNumber(latest.diasCaja) }}
                            </p>
                        </div>
                        <div class="flex shrink-0 items-start gap-1.5">
                            <Badge
                                v-if="latest?.diasCaja !== null && latest?.diasCaja !== undefined"
                                :variant="latest.diasCaja < 2 ? 'destructive' : 'secondary'"
                                :class="latest.diasCaja >= 2 ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''"
                            >
                                {{ latest.diasCaja < 2 ? 'Alerta' : 'Normal' }}
                            </Badge>
                            <div v-if="diasCajaComparison" class="flex shrink-0 flex-col items-end gap-0.5 text-right">
                                <Badge
                                    :variant="diasCajaComparison.tone === 'negative' ? 'destructive' : 'secondary'"
                                    :class="comparisonBadgeClass(diasCajaComparison)"
                                >
                                    {{ diasCajaComparison.text }}
                                </Badge>
                                <span class="text-[10px] leading-none text-muted-foreground">vs sem. anterior</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card class="gap-0 overflow-hidden py-0">
                    <button
                        type="button"
                        class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-1 text-left"
                        :aria-expanded="isResumenDetalleOpen"
                        aria-controls="resumen-detalle-indicadores"
                        @click="isResumenDetalleOpen = !isResumenDetalleOpen"
                    >
                        <div class="min-w-0">
                            <CardDescription>Desglose del resumen</CardDescription>
                            <p class="text-xl font-semibold leading-tight tracking-tight">
                                6 indicadores
                            </p>
                        </div>
                        <ChevronDown
                            class="size-4 shrink-0 text-muted-foreground transition-transform"
                            :class="isResumenDetalleOpen ? 'rotate-180' : ''"
                        />
                    </button>
                </Card>
            </div>

            <div
                v-if="isResumenDetalleOpen"
                id="resumen-detalle-indicadores"
                class="grid gap-2 sm:grid-cols-2 xl:grid-cols-6"
            >
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Caja</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.cajaFinal) }}</p>
                </div>
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Bancos</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.bancos) }}</p>
                </div>
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Valores</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.valores) }}</p>
                </div>
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Fondos</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.fondosFci) }}</p>
                </div>
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Proveedores actual</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.proveedores) }}</p>
                </div>
                <div class="rounded-lg border bg-card p-2.5 shadow-sm">
                    <p class="text-[11px] font-semibold text-foreground">Otros pagos / Impuestos</p>
                    <p class="mt-0.5 text-sm font-semibold">{{ formatCurrency(latest?.opvOtros) }}</p>
                </div>
            </div>

        </section>

        <section id="proyeccion" v-if="dashboardData.length" class="scroll-mt-24 space-y-3">
            <div class="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                <h2 class="text-lg font-semibold tracking-tight">Proyección semanal</h2>
                <p class="min-w-0 truncate text-sm text-muted-foreground">
                    Cobranzas y compromisos previstos para {{ latest?.semana }}.
                </p>
            </div>

            <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                <Card v-for="kpi in proyeccionSemanal" :key="kpi.title" class="gap-2 py-1" :title="kpi.description">
                    <CardContent class="flex min-w-0 items-center justify-between gap-3 px-4">
                        <div class="min-w-0">
                            <CardDescription class="truncate font-semibold text-foreground">{{ kpi.title }}</CardDescription>
                            <p class="truncate text-xl font-semibold leading-tight tracking-tight">{{ kpi.value }}</p>
                        </div>
                        <div v-if="kpi.comparison" class="flex shrink-0 flex-col items-end gap-0.5 text-right">
                            <Badge
                                :variant="kpi.comparison.tone === 'negative' ? 'destructive' : 'secondary'"
                                :class="comparisonBadgeClass(kpi.comparison)"
                            >
                                {{ kpi.comparison.text }}
                            </Badge>
                            <span class="text-[10px] leading-none text-muted-foreground">
                                vs sem. anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card class="gap-0 overflow-hidden py-0">
                    <button
                        type="button"
                        class="flex h-full w-full cursor-pointer items-center justify-between gap-3 px-4 py-1 text-left"
                        :aria-expanded="isOtrosDatosOpen"
                        aria-controls="otros-datos-indicadores"
                        @click="isOtrosDatosOpen = !isOtrosDatosOpen"
                    >
                        <div class="min-w-0">
                            <CardDescription class="truncate font-semibold text-foreground">
                                Desglose del resumen
                            </CardDescription>
                            <p class="text-xl font-semibold leading-tight tracking-tight">
                                Otros datos
                            </p>
                        </div>
                        <ChevronDown
                            class="size-4 shrink-0 text-muted-foreground transition-transform"
                            :class="isOtrosDatosOpen ? 'rotate-180' : ''"
                        />
                    </button>
                </Card>
            </div>

            <div
                v-if="isOtrosDatosOpen"
                id="otros-datos-indicadores"
                class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
            >
                <Card
                    v-for="dato in otrosDatosDelDia"
                    :key="dato.title"
                    class="gap-2 py-1"
                    :title="dato.description"
                >
                    <CardContent class="flex min-w-0 items-center justify-between gap-3 px-4">
                        <div class="min-w-0">
                            <CardDescription class="truncate font-semibold text-foreground">{{ dato.title }}</CardDescription>
                            <p class="text-xl font-semibold leading-tight tracking-tight">
                                {{ dato.value }}
                            </p>
                        </div>

                        <div
                            v-if="dato.comparison"
                            class="flex shrink-0 flex-col items-end gap-0.5 text-right"
                        >
                            <Badge
                                :variant="dato.comparison.tone === 'negative' ? 'destructive' : 'secondary'"
                                :class="comparisonBadgeClass(dato.comparison)"
                            >
                                {{ dato.comparison.text }}
                            </Badge>
                            <span class="text-[10px] leading-none text-muted-foreground">
                                vs sem. anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>

        <section
            id="tendencias"
            v-if="dashboardData.length"
            class="scroll-mt-24 min-w-0 space-y-3"
        >
            <Separator />

            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div class="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                    <h2 class="text-lg font-semibold tracking-tight">
                        Tendencias
                    </h2>
                    <p class="min-w-0 truncate text-sm text-muted-foreground" title="Evolución de los principales indicadores durante el período seleccionado.">
                        Evolución de los principales indicadores durante el período seleccionado.
                    </p>
                </div>

                <div class="flex shrink-0 flex-wrap gap-2" aria-label="Período de análisis">
                    <Button
                        v-for="range in ['6', '12', '24', '52']"
                        :key="range"
                        :variant="selectedRange === range ? 'default' : 'outline'"
                        size="sm"
                        @click="selectedRange = range as '6' | '12' | '24' | '52'"
                    >
                        {{ range }} semanas
                    </Button>
                </div>
            </div>

            <div class="grid min-w-0 gap-3 xl:grid-cols-2 [&>*]:min-w-0">
           <Card class="gap-2 py-2 xl:col-span-2">
    <CardHeader class="px-4">
        <div class="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <CardTitle class="shrink-0">
                Disponibilidades y Pasivos
            </CardTitle>

            <CardDescription
                class="min-w-0 truncate"
                title="Comparación diaria entre disponibilidades actuales y total de pasivos actuales. Los datos faltantes se muestran como huecos, no como cero."
            >
                Comparación diaria entre disponibilidades actuales y total de pasivos
                actuales. Los datos faltantes se muestran como huecos, no como cero.
            </CardDescription>
        </div>
    </CardHeader>

    <CardContent class="space-y-2 px-4">
        <VisBulletLegend :items="legendFlujoProyectado" />

        <div class="h-[210px]">
            <ChartContainer
                :config="flujoChartConfig"
                class="h-full w-full"
            >
                <VisXYContainer :data="filteredData" :height="200">
                    <VisLine
                        :x="x"
                        :y="yDisponibilidades"
                        :color="chartColors.disponibilidades"
                    />

                    <VisLine
                        :x="x"
                        :y="yTotalPasivos"
                        :color="chartColors.totalPasivos"
                    />

                    <VisAxis type="x" :tick-format="getDayXAxisLabel" />
                    <VisAxis type="y" :tick-format="currencyTooltip" />

                    <ChartTooltip />

                    <ChartCrosshair
                        :template="componentToString(flujoChartConfig, ChartTooltipContent, {
                           labelFormatter(value: number | Date) {
                                if (value instanceof Date) {
                                    return ''
                                }

                                const fecha = filteredData[value]?.fecha
                                return fecha ? formatDate(fecha) : ''
                            },
                        })"
                        :color="[
                            chartColors.disponibilidades,
                            chartColors.totalPasivos,
                        ]"
                    />
                </VisXYContainer>
            </ChartContainer>
        </div>
    </CardContent>
</Card>

            <Card class="gap-2 py-2">
    <CardHeader class="flex min-w-0 flex-col gap-0.5 px-4 sm:flex-row sm:items-baseline sm:gap-2">
        <CardTitle class="shrink-0">
            Caja, Bancos, Valores y Fondos
        </CardTitle>

        <CardDescription
            class="min-w-0 truncate"
            title="Composición de las disponibilidades incluyendo fondos comunes de inversión. Los datos faltantes se muestran como ausencia de barra."
        >
            Composición de las disponibilidades incluyendo fondos comunes de inversión.
            Los datos faltantes se muestran como ausencia de barra.
        </CardDescription>
    </CardHeader>

    <CardContent class="space-y-2 px-4">
        <VisBulletLegend :items="legendCajaBancosValoresFci" />

        <div class="h-[170px]">
            <ChartContainer
                :config="composicionChartConfig"
                class="h-full w-full"
            >
                <VisXYContainer :data="filteredData" :height="160">
                    <VisStackedBar
                        :x="x"
                        :y="yCajaBancosValoresFci"
                        :color="[
                            chartColors.caja,
                            chartColors.bancos,
                            chartColors.valores,
                            chartColors.fondosFci,
                        ]"
                    />

                    <VisAxis type="x" :tick-format="getXAxisLabel" />
                    <VisAxis type="y" :tick-format="currencyTooltip" />

                    <ChartTooltip />

                    <ChartCrosshair
                        :template="componentToString(composicionChartConfig, ChartTooltipContent, {
                           labelFormatter(value: number | Date) {
                                if (value instanceof Date) {
                                    return ''
                                }

                                return filteredData[value]?.semana ?? ''
                            },
                        })"
                        :color="[
                            chartColors.caja,
                            chartColors.bancos,
                            chartColors.valores,
                            chartColors.fondosFci,
                        ]"
                    />
                </VisXYContainer>
            </ChartContainer>
        </div>
    </CardContent>
</Card>

            <Card class="gap-2 py-2">
    <CardHeader class="flex min-w-0 flex-col gap-0.5 px-4 sm:flex-row sm:items-baseline sm:gap-2">
        <CardTitle class="shrink-0">
            Cobranzas y Obligaciones proyectadas
        </CardTitle>

        <CardDescription class="min-w-0 truncate">
            Cobranzas proyectadas frente a proveedores a vencer y otros pagos proyectados.
            <template v-if="!hayProyecciones">
                No hay proyecciones disponibles para este período.
            </template>
        </CardDescription>
    </CardHeader>

    <CardContent class="space-y-2 px-4">
        <VisBulletLegend :items="legendProyecciones" />

        <div class="h-[170px]">
            <ChartContainer
                :config="proyeccionesChartConfig"
                class="h-full w-full"
            >
                <VisXYContainer :data="filteredData" :height="160">
                    <VisLine
                        :x="x"
                        :y="yCobranzasProyectadas"
                        :color="chartColors.cobranzasProyectadas"
                    />

                    <VisLine
                        :x="x"
                        :y="yCompromisosProyectados"
                        :color="chartColors.compromisosProyectados"
                    />

                    <VisAxis type="x" :tick-format="getXAxisLabel" />
                    <VisAxis type="y" :tick-format="currencyTooltip" />

                    <ChartTooltip />

                    <ChartCrosshair
                        :template="componentToString(proyeccionesChartConfig, ChartTooltipContent, {
                            labelFormatter(value: number | Date) {
                                if (value instanceof Date) {
                                    return ''
                                }

                                return filteredData[value]?.semana ?? ''
                            },
                        })"
                        :color="[
                            chartColors.cobranzasProyectadas,
                            chartColors.compromisosProyectados,
                        ]"
                    />
                </VisXYContainer>
            </ChartContainer>
        </div>
    </CardContent>
</Card>
            </div>
        </section>

        <Card id="detalle" v-if="dashboardData.length" class="scroll-mt-24 gap-3 py-4">
            <CardHeader class="flex min-w-0 flex-col gap-0.5 px-4 sm:flex-row sm:items-baseline sm:gap-2">
                <CardTitle class="shrink-0">
                    Detalle últimas semanas
                </CardTitle>

                <CardDescription class="min-w-0 truncate" title="Tabla basada en los indicadores reales y ajustes solicitados.">
                    Tabla basada en los indicadores reales y ajustes solicitados.
                </CardDescription>
            </CardHeader>

            <CardContent class="px-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Semana</TableHead>
                            <TableHead>Disponibilidades</TableHead>
                            <TableHead>Fondos</TableHead>
                            <TableHead>Cobranzas promedio</TableHead>
                            <TableHead>Cobranzas proyectadas</TableHead>
                            <TableHead>Prov. a pagar</TableHead>
                            <TableHead>Otros pagos / Impuestos</TableHead>
                            <TableHead>Compromisos</TableHead>
                            <TableHead>Ventas netas</TableHead>
                            <TableHead>Acopio mes</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        <TableRow v-for="item in filteredData" :key="item.fecha">
                            <TableCell>{{ item.semana }}</TableCell>
                            <TableCell>{{ formatCurrency(item.totalDisponibilidades) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.fondosFci) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.cobranzas) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.cobranzasProyectadas) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.proveedoresAVencerFinal) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.otrosPagosProyectados) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.compromisosProyectados) }}</TableCell>
                            <TableCell>{{ formatCurrency(item.ventasNetas) }}</TableCell>

                            <TableCell>
                                <Badge :variant="item.acopioMesActual !== null && item.acopioMesActual < 0 ? 'destructive' : 'default'">
                                    {{ formatCurrency(item.acopioMesActual) }}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

    </component>
</template>
