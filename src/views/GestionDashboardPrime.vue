<script setup lang="ts">
import { computed, ref } from 'vue'

import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Chart from 'primevue/chart'

import { gestionMock } from '@/data/gestion.mock'
// import type { GestionRecord } from '@/data/gestion.mock'
import { formatCurrency, formatNumber } from '@/lib/formatters'


const isDarkMode = ref(false)

function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value

    document.documentElement.classList.toggle('dark', isDarkMode.value)
}

const selectedRange = ref<'6' | '12' | '24' | '52'>('6')

const filteredData = computed(() => {
    return gestionMock.slice(Number(selectedRange.value) * -1)
})

const latest = computed(() => {
    return filteredData.value[filteredData.value.length - 1]
})

const previous = computed(() => {
    return filteredData.value[filteredData.value.length - 2]
})

const chartColors = {
    disponibilidades: '#2563eb',
    proveedores: '#f97316',
    impuestos: '#dc2626',
    cobranzasProyectadas: '#16a34a',

    caja: '#2563eb',
    bancos: '#16a34a',
    valores: '#f97316',
    fondos: '#7c3aed',

    ventasNetas: '#0f766e',
    cobranzas: '#9333ea',
}

function variation(current?: number | null, old?: number | null) {
    if (
        current === null ||
        current === undefined ||
        old === null ||
        old === undefined ||
        old === 0
    ) {
        return null
    }

    return ((current - old) / old) * 100
}

function getVariationSeverity(value: number | null) {
    if (value === null) return 'secondary'
    return value >= 0 ? 'success' : 'danger'
}

function getCriticalSeverity(type: 'danger' | 'warn' | 'info') {
    if (type === 'danger') return 'danger'
    if (type === 'warn') return 'warn'
    return 'info'
}

const kpis = computed(() => {
    const current = latest.value
    const old = previous.value

    if (!current) return []

    return [
        {
            title: 'Disponibilidades',
            icon: 'pi pi-wallet',
            valueLabel: 'Actual',
            value: formatCurrency(current.totalDisponibilidades),
            projectedLabel: null,
            projected: null,
            variation: variation(current.totalDisponibilidades, old?.totalDisponibilidades),
            description: 'Caja + bancos + valores + fondos',
        },
        {
            title: 'Fondos',
            icon: 'pi pi-building-columns',
            valueLabel: 'Actual',
            value: formatCurrency(current.fci),
            projectedLabel: null,
            projected: null,
            variation: variation(current.fci, old?.fci),
            description: 'Fondos comunes de inversión',
        },
        {
            title: 'Cobranzas',
            icon: 'pi pi-arrow-circle-down',
            valueLabel: 'Real',
            value: formatCurrency(current.cobranzas),
            projectedLabel: 'Proyectado semana',
            projected: formatCurrency(current.cobranzasProyectadas),
            variation: variation(current.cobranzas, old?.cobranzas),
            description: 'Proyectado según ventas semana anterior',
        },
        {
            title: 'Proveedores a pagar',
            icon: 'pi pi-truck',
            valueLabel: 'Actual',
            value: formatCurrency(current.proveedores),
            projectedLabel: 'Proyectado semana',
            projected: formatCurrency(current.proveedoresAPagarProyectadoSemana),
            variation: variation(current.proveedores, old?.proveedores),
            description: 'Dato manual / vencimientos',
        },
        {
            title: 'Impuestos a pagar',
            icon: 'pi pi-file-check',
            valueLabel: 'Actual',
            value: formatCurrency(current.impuestosAPagar),
            projectedLabel: 'Proyectado semana',
            projected: formatCurrency(current.impuestosAPagarProyectadoSemana),
            variation: variation(current.impuestosAPagar, old?.impuestosAPagar),
            description: 'Dato manual',
        },
        {
            title: 'Total pasivos',
            icon: 'pi pi-exclamation-circle',
            valueLabel: 'Actual',
            value: formatCurrency(current.totalPasivos),
            projectedLabel: null,
            projected: null,
            variation: variation(current.totalPasivos, old?.totalPasivos),
            description: 'Pasivos cargados en planilla',
        },
    ]
})

const criticalAlerts = computed(() => {
    const current = latest.value

    if (!current) return []

    const alerts: Array<{
        title: string
        description: string
        type: 'danger' | 'warn' | 'info'
    }> = []

    const compromisosProyectados =
        (current.proveedoresAPagarProyectadoSemana ?? 0) +
        (current.impuestosAPagarProyectadoSemana ?? 0)

    if (
        current.diasCaja !== null &&
        current.diasCaja !== undefined &&
        current.diasCaja < 2
    ) {
        alerts.push({
            title: 'Días de caja bajo',
            description: `El último valor disponible es ${formatNumber(current.diasCaja)} días.`,
            type: 'danger',
        })
    }

    if (compromisosProyectados > (current.totalDisponibilidades ?? 0)) {
        alerts.push({
            title: 'Compromisos proyectados superan disponibilidades',
            description: `${formatCurrency(compromisosProyectados)} contra ${formatCurrency(
                current.totalDisponibilidades
            )} disponibles.`,
            type: 'danger',
        })
    }

    if ((current.cobranzasProyectadas ?? 0) < compromisosProyectados) {
        alerts.push({
            title: 'Cobranzas proyectadas insuficientes',
            description: `${formatCurrency(current.cobranzasProyectadas)} proyectadas contra ${formatCurrency(
                compromisosProyectados
            )} a pagar.`,
            type: 'warn',
        })
    }

    if ((current.acopioMesActual ?? 0) < 0) {
        alerts.push({
            title: 'Acopio del mes actual negativo',
            description: `Valor actual: ${formatCurrency(current.acopioMesActual)}.`,
            type: 'danger',
        })
    }

    if ((current.bancosDescubierto ?? 0) > 0) {
        alerts.push({
            title: 'Uso de bancos descubierto',
            description: `Valor actual: ${formatCurrency(current.bancosDescubierto)}.`,
            type: 'warn',
        })
    }

    return alerts
})

const chartOptions = computed(() => {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    boxHeight: 8,
                },
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label(context: any) {
                        const label = context.dataset.label || ''
                        const value = context.parsed.y ?? 0
                        return `${label}: ${formatCurrency(value)}`
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
            },
            y: {
                ticks: {
                    callback(value: number) {
                        return formatCurrency(value)
                    },
                },
            },
        },
    }
})

const flujoChartData = computed(() => {
    return {
        labels: filteredData.value.map((item) => item.semana),
        datasets: [
            {
                label: 'Disponibilidades',
                data: filteredData.value.map((item) => item.totalDisponibilidades ?? 0),
                borderColor: chartColors.disponibilidades,
                backgroundColor: chartColors.disponibilidades,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 7,
            },
            {
                label: 'Prov. a pagar proyectado',
                data: filteredData.value.map((item) => item.proveedoresAPagarProyectadoSemana ?? 0),
                borderColor: chartColors.proveedores,
                backgroundColor: chartColors.proveedores,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 7,
            },
            {
                label: 'Impuestos a pagar proyectado',
                data: filteredData.value.map((item) => item.impuestosAPagarProyectadoSemana ?? 0),
                borderColor: chartColors.impuestos,
                backgroundColor: chartColors.impuestos,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 7,
            },
            {
                label: 'Cobranzas proyectadas',
                data: filteredData.value.map((item) => item.cobranzasProyectadas ?? 0),
                borderColor: chartColors.cobranzasProyectadas,
                backgroundColor: chartColors.cobranzasProyectadas,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 7,
            },
        ],
    }
})

const composicionChartData = computed(() => {
    return {
        labels: filteredData.value.map((item) => item.semana),
        datasets: [
            {
                label: 'Caja',
                data: filteredData.value.map((item) => item.caja ?? 0),
                backgroundColor: chartColors.caja,
                stack: 'disponibilidades',
            },
            {
                label: 'Bancos',
                data: filteredData.value.map((item) => item.bancos ?? 0),
                backgroundColor: chartColors.bancos,
                stack: 'disponibilidades',
            },
            {
                label: 'Valores',
                data: filteredData.value.map((item) => item.valores ?? 0),
                backgroundColor: chartColors.valores,
                stack: 'disponibilidades',
            },
            {
                label: 'Fondos',
                data: filteredData.value.map((item) => item.fci ?? 0),
                backgroundColor: chartColors.fondos,
                stack: 'disponibilidades',
            },
        ],
    }
})

const composicionChartOptions = computed(() => {
    return {
        ...chartOptions.value,
        scales: {
            x: {
                stacked: true,
                grid: {
                    display: false,
                },
            },
            y: {
                stacked: true,
                ticks: {
                    callback(value: number) {
                        return formatCurrency(value)
                    },
                },
            },
        },
    }
})

const ventasCobranzasChartData = computed(() => {
    return {
        labels: filteredData.value.map((item) => item.semana),
        datasets: [
            {
                label: 'Ventas netas',
                data: filteredData.value.map((item) => item.ventasNetas ?? 0),
                backgroundColor: chartColors.ventasNetas,
                borderRadius: 8,
            },
            {
                label: 'Cobranzas reales',
                data: filteredData.value.map((item) => item.cobranzas ?? 0),
                backgroundColor: chartColors.cobranzas,
                borderRadius: 8,
            },
        ],
    }
})

const tableRows = computed(() => {
    return filteredData.value.map((item) => {
        const compromisosProyectados =
            (item.proveedoresAPagarProyectadoSemana ?? 0) +
            (item.impuestosAPagarProyectadoSemana ?? 0)

        return {
            ...item,
            compromisosProyectados,
        }
    })
})
</script>

<template>
    <main
    class="min-h-screen p-6 transition-colors"
    :class="isDarkMode ? 'bg-surface-950 text-surface-50' : 'bg-surface-50 text-surface-900'"
>
        <section class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
                <h1 class="text-3xl font-bold tracking-tight">
                    Tablero de Gestión de Finanzas
                </h1>

                <p v-if="latest" class="mt-1 text-sm text-surface-500">
                    Última fecha disponible: {{ latest.fecha }} · Semana {{ latest.semana }}
                </p>
            </div>

            <div class="flex flex-wrap gap-2">
                <Button
        v-for="range in ['6', '12', '24', '52']"
        :key="range"
        :label="`${range} semanas`"
        :outlined="selectedRange !== range"
        size="small"
        @click="selectedRange = range as '6' | '12' | '24' | '52'"
    />

    <Button
        :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
        :label="isDarkMode ? 'Claro' : 'Oscuro'"
        severity="secondary"
        outlined
        size="small"
        @click="toggleDarkMode"
    />
            </div>
        </section>

        <section class="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card
    v-for="kpi in kpis"
    :key="kpi.title"
    class="shadow-sm transition-colors"
    :class="isDarkMode ? 'bg-surface-900 border border-surface-100 text-surface-50' : 'bg-white border border-surface-100 text-surface-900'"
>
                <template #content>
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm text-surface-500">
                                {{ kpi.title }}
                            </p>

                            <div
                                class="mt-3 grid gap-4"
                                :class="kpi.projectedLabel ? 'grid-cols-2' : 'grid-cols-1'"
                            >
                                <div>
                                    <p class="text-xs text-surface-500">
                                        {{ kpi.valueLabel }}
                                    </p>

                                    <p class="mt-1 text-2xl font-bold">
                                        {{ kpi.value }}
                                    </p>
                                </div>

                                <div v-if="kpi.projectedLabel" class="border-l border-surface-200 pl-4">
                                    <p class="text-xs text-surface-500">
                                        {{ kpi.projectedLabel }}
                                    </p>

                                    <p class="mt-1 text-lg font-bold">
                                        {{ kpi.projected }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                            <i :class="kpi.icon" />
                        </div>
                    </div>

                    <div class="mt-4 flex items-center justify-between gap-3">
                        <p class="text-xs text-surface-500">
                            {{ kpi.description }}
                        </p>

                        <Tag
                            v-if="kpi.variation !== null"
                            :severity="getVariationSeverity(kpi.variation)"
                            :value="`${formatNumber(kpi.variation)}%`"
                            rounded
                        />
                    </div>
                </template>
            </Card>
        </section>

        <section v-if="criticalAlerts.length" class="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card
    v-for="alert in criticalAlerts"
    :key="alert.title"
    class="border shadow-sm transition-colors"
    :class="isDarkMode ? 'border-red-900 bg-surface-900 text-surface-50' : 'border-red-100 bg-white text-surface-900'"
>
                <template #content>
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="font-semibold">
                                {{ alert.title }}
                            </p>

                            <p class="mt-2 text-sm text-surface-500">
                                {{ alert.description }}
                            </p>
                        </div>

                        <Tag
                            :severity="getCriticalSeverity(alert.type)"
                            value="Alerta"
                            rounded
                        />
                    </div>
                </template>
            </Card>
        </section>

        <section class="mb-6 grid gap-4 xl:grid-cols-2">
            <Card
                class="xl:col-span-2 shadow-sm transition-colors"
                :class="isDarkMode ? 'bg-surface-900 border border-surface-100 text-surface-50' : 'bg-white border border-surface-100 text-surface-900'"
            >
                <template #title>
                    Disponibilidades, Cobranzas proyectadas y Compromisos
                </template>

                <template #subtitle>
                    Comparación entre disponibilidades, cobranzas proyectadas, proveedores e impuestos a pagar.
                </template>

                <template #content>
                    <div class="h-[360px]">
                        <Chart
                            type="line"
                            :data="flujoChartData"
                            :options="chartOptions"
                            class="h-full"
                        />
                    </div>
                </template>
            </Card>

            <Card
    class="shadow-sm transition-colors"
    :class="isDarkMode ? 'bg-surface-900 border border-surface-100 text-surface-50' : 'bg-white border border-surface-100 text-surface-900'"
>
                <template #title>
                    Caja, Bancos, Valores y Fondos
                </template>

                <template #subtitle>
                    Composición de las disponibilidades incluyendo fondos comunes de inversión.
                </template>

                <template #content>
                    <div class="h-[340px]">
                        <Chart
                            type="bar"
                            :data="composicionChartData"
                            :options="composicionChartOptions"
                            class="h-full"
                        />
                    </div>
                </template>
            </Card>

            <Card
    class="shadow-sm transition-colors"
    :class="isDarkMode ? 'bg-surface-900 border border-surface-100 text-surface-50' : 'bg-white border border-surface-100 text-surface-900'"
>
                <template #title>
                    Ventas netas vs Cobranzas reales
                </template>

                <template #subtitle>
                    Comparación lado a lado entre ventas netas y cobranzas reales.
                </template>

                <template #content>
                    <div class="h-[340px]">
                        <Chart
                            type="bar"
                            :data="ventasCobranzasChartData"
                            :options="chartOptions"
                            class="h-full"
                        />
                    </div>
                </template>
            </Card>
        </section>

        <Card
    class="shadow-sm transition-colors"
    :class="isDarkMode ? 'bg-surface-900 border border-surface-100 text-surface-50' : 'bg-white border border-surface-100 text-surface-900'"
>
            <template #title>
                Detalle últimas semanas
            </template>

            <template #subtitle>
                Tabla basada en los indicadores reales y ajustes solicitados.
            </template>

            <template #content>
                <DataTable
                    :value="tableRows"
                    paginator
                    :rows="10"
                    responsiveLayout="scroll"
                    class="text-sm"
                >
                    <Column field="semana" header="Semana" frozen />

                    <Column header="Disponibilidades">
                        <template #body="{ data }">
                            {{ formatCurrency(data.totalDisponibilidades) }}
                        </template>
                    </Column>

                    <Column header="Fondos">
                        <template #body="{ data }">
                            {{ formatCurrency(data.fci) }}
                        </template>
                    </Column>

                    <Column header="Cobranzas reales">
                        <template #body="{ data }">
                            {{ formatCurrency(data.cobranzas) }}
                        </template>
                    </Column>

                    <Column header="Cobranzas proyectadas">
                        <template #body="{ data }">
                            {{ formatCurrency(data.cobranzasProyectadas) }}
                        </template>
                    </Column>

                    <Column header="Prov. a pagar">
                        <template #body="{ data }">
                            {{ formatCurrency(data.proveedoresAPagarProyectadoSemana) }}
                        </template>
                    </Column>

                    <Column header="Impuestos">
                        <template #body="{ data }">
                            {{ formatCurrency(data.impuestosAPagarProyectadoSemana) }}
                        </template>
                    </Column>

                    <Column header="Otros pagos proyectados">
                        <template #body="{ data }">
                            {{ formatCurrency(data.opvOtrosProyectadoSemana) }}
                        </template>
                    </Column>

                    <Column header="Compromisos">
                        <template #body="{ data }">
                            {{ formatCurrency(data.compromisosProyectados) }}
                        </template>
                    </Column>

                    <Column header="Ventas netas">
                        <template #body="{ data }">
                            {{ formatCurrency(data.ventasNetas) }}
                        </template>
                    </Column>

                    <Column header="Acopio mes">
                        <template #body="{ data }">
                            <Tag
                                :severity="(data.acopioMesActual ?? 0) < 0 ? 'danger' : 'success'"
                                :value="formatCurrency(data.acopioMesActual)"
                                rounded
                            />
                        </template>
                    </Column>
                </DataTable>
            </template>
        </Card>
    </main>
</template>
<style scoped>
:deep(.p-card) {
    background: inherit;
    color: inherit;
}

:deep(.p-card-body),
:deep(.p-card-content),
:deep(.p-card-title),
:deep(.p-card-subtitle) {
    background: transparent;
    color: inherit;
}

/* DataTable - modo claro/oscuro controlado por el wrapper */
:deep(.p-datatable),
:deep(.p-datatable-table),
:deep(.p-datatable-wrapper) {
    background: inherit;
    color: inherit;
}

:deep(.p-datatable-header),
:deep(.p-datatable-footer) {
    background: inherit;
    color: inherit;
    border-color: rgb(226 232 240);
}

:deep(.p-datatable-thead > tr > th) {
    background: inherit;
    color: inherit;
    border-color: rgb(226 232 240);
}

:deep(.p-datatable-tbody > tr) {
    background: inherit;
    color: inherit;
}

:deep(.p-datatable-tbody > tr > td) {
    background: inherit;
    color: inherit;
    border-color: rgb(226 232 240);
}

:deep(.p-datatable-tbody > tr:hover > td) {
    background: rgb(248 250 252);
}

/* Paginador */
:deep(.p-paginator) {
    background: inherit;
    color: inherit;
    border-color: rgb(226 232 240);
}

:deep(.p-datatable-paginator-bottom) {
    border-color: rgb(226 232 240);
}

:deep(.p-paginator .p-paginator-page),
:deep(.p-paginator .p-paginator-first),
:deep(.p-paginator .p-paginator-prev),
:deep(.p-paginator .p-paginator-next),
:deep(.p-paginator .p-paginator-last) {
    color: inherit;
}

/* Dark mode específico */
:global(.dark) :deep(.p-datatable),
:global(.dark) :deep(.p-datatable-table),
:global(.dark) :deep(.p-datatable-wrapper),
:global(.dark) :deep(.p-datatable-thead > tr > th),
:global(.dark) :deep(.p-datatable-tbody > tr),
:global(.dark) :deep(.p-datatable-tbody > tr > td),
:global(.dark) :deep(.p-paginator) {
    background: rgb(15 23 42);
    color: rgb(248 250 252);
    border-color: rgb(51 65 85);
}

:global(.dark) :deep(.p-datatable-tbody > tr:hover > td) {
    background: rgb(30 41 59);
}

:global(.dark) :deep(.p-datatable-tbody > tr.p-datatable-row-selected > td) {
    background: rgb(30 41 59);
    color: rgb(248 250 252);
}

:deep(.p-chart) {
    color: inherit;
}
</style>
