<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
    CalendarDays,
    Loader2,
    Play,
    Plus,
    RefreshCcw,
    Save,
    Trash2,
    X,
} from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
/* import { Separator } from '@/components/ui/separator' */
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'

import { useGestionDrawer } from '@/composables/useGestion'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import {
    parseManualMoneyInput,
    type GestionManuales,
    type GestionRegistro,
} from '@/types/gestion'

const emit = defineEmits<{
    saved: [registro: GestionRegistro]
}>()

const open = ref(false)
const showAjusteCaja = ref(false)
const showAjusteProveedores = ref(false)
const dateDraft = ref('')

const {
    selectedDate,
    existingRecord,
    automaticos,
    manuales,
    calculados,
    sincronizadoEn,
    isBusy,
    hasDate,
    hasUnsavedChanges,
    errorMessage,
    status,
    changeDate,
    checkSelectedDate,
    syncAutomaticos: syncFromApi,
    saveRegistro: saveThroughApi,
    resetDrawer,
} = useGestionDrawer()

const statusLabel = computed(() => {
    const labels = {
        sin_fecha: 'Sin fecha',
        sin_sincronizar: 'Sin sincronizar',
        consultando: 'Consultando',
        sincronizando: 'Sincronizando',
        sincronizado: 'Sincronizado',
        modificado: 'Modificado',
        guardando: 'Guardando',
        guardado: 'Guardado',
        error: 'Error',
    }

    return labels[status.value]
})

const statusVariant = computed(() => {
    if (status.value === 'error') return 'destructive'
    if (status.value === 'guardado' || status.value === 'sincronizado') return 'default'
    if (status.value === 'modificado') return 'secondary'
    return 'outline'
})

function onDateInput(nextDate: string) {
    dateDraft.value = nextDate
}

async function onDateCommit() {
    if (dateDraft.value === selectedDate.value) return

    const changed = await changeDate(dateDraft.value)

    if (!changed) {
        dateDraft.value = selectedDate.value
    }
}

async function checkExistingRecord() {
    await checkSelectedDate()
}

async function syncAutomaticos() {
    await syncFromApi()
}

async function saveRegistro() {
    const saved = await saveThroughApi()

    if (saved) {
        emit('saved', saved)
        toast.success('Datos guardados correctamente.', {
            description: `Registro ${saved.semana}`,
        })
    }
}

function closeDrawer() {
    if (hasUnsavedChanges.value) {
        const confirmed = window.confirm(
            'Hay cambios sin guardar. ¿Querés cerrar de todos modos?'
        )

        if (!confirmed) return
    }

    resetDrawer()
    showAjusteCaja.value = false
    showAjusteProveedores.value = false
    Object.keys(moneyErrors).forEach((field) => {
        delete moneyErrors[field as MoneyField]
    })
    open.value = false
}

function enableAjusteCaja() {
    showAjusteCaja.value = true
    if (manuales.ajusteCaja === null) manuales.ajusteCaja = 0
}

function removeAjusteCaja() {
    manuales.ajusteCaja = null
    showAjusteCaja.value = false
}

function enableAjusteProveedores() {
    showAjusteProveedores.value = true
    if (manuales.ajusteProveedoresAVencer === null) {
        manuales.ajusteProveedoresAVencer = 0
    }
}

function removeAjusteProveedores() {
    manuales.ajusteProveedoresAVencer = null
    showAjusteProveedores.value = false
}

type MoneyField = Exclude<keyof GestionManuales, 'observacion'>
const moneyErrors = reactive<Partial<Record<MoneyField, string>>>({})

function updateMoney(field: MoneyField, value: string) {
    const parsed = parseManualMoneyInput(value, {
        allowNegative:
            field === 'ajusteCaja' ||
            field === 'ajusteProveedoresAVencer',
    })

    if (!parsed.ok) {
        moneyErrors[field] = parsed.reason === 'negative'
            ? 'El importe no puede ser negativo.'
            : 'Ingresá un importe numérico válido.'
        return
    }

    delete moneyErrors[field]
    manuales[field] = parsed.value
}

function moneyInputValue(value: number | null) {
    return value === null ? '' : String(value)
}

function displayDateTime(value: string | null) {
    if (!value) return null

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-AR')
}

const lastSyncedAt = computed(() =>
    displayDateTime(sincronizadoEn.value)
)

watch(existingRecord, (record) => {
    showAjusteCaja.value = record?.manuales?.ajusteCaja !== null &&
        record?.manuales?.ajusteCaja !== undefined
    showAjusteProveedores.value =
        record?.manuales?.ajusteProveedoresAVencer !== null &&
        record?.manuales?.ajusteProveedoresAVencer !== undefined
})

watch(
    selectedDate,
    (date) => {
        dateDraft.value = date
    },
    { immediate: true }
)
</script>

<template>
    <Sheet v-model:open="open">
        <SheetTrigger as-child>
            <Button variant="outline" size="sm">
                <CalendarDays class="mr-2 h-4 w-4" />
                Cargar / actualizar datos
            </Button>
        </SheetTrigger>

        <SheetContent class="flex h-full w-full flex-col p-0 sm:max-w-5xl">
            <SheetHeader class="sticky top-0 z-10 border-b bg-background p-5">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <SheetTitle>
                            Carga del Tablero de Gestión de Finanzas
                        </SheetTitle>

                        <SheetDescription>
                            Seleccioná una fecha, sincronizá los datos automáticos desde Plataforma y completá los datos manuales.
                        </SheetDescription>
                    </div>

                    <Badge :variant="statusVariant">
                        <Loader2
                            v-if="isBusy"
                            class="mr-1 h-3 w-3 animate-spin"
                        />
                        {{ statusLabel }}
                    </Badge>
                </div>
            </SheetHeader>

            <div class="flex-1 overflow-y-auto p-5">
                <div class="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">
                                Fecha del registro
                            </CardTitle>
                        </CardHeader>

                        <CardContent class="grid gap-4 md:grid-cols-[260px_1fr] md:items-end">
                            <div class="space-y-2">
                                <Label for="fecha">
                                    Fecha obligatoria
                                </Label>

                                <Input
                                    id="fecha"
                                    :model-value="dateDraft"
                                    type="date"
                                    :disabled="isBusy"
                                    @update:model-value="onDateInput(String($event))"
                                    @blur="onDateCommit"
                                />
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    :disabled="!hasDate || isBusy"
                                    @click="checkExistingRecord"
                                >
                                    <RefreshCcw class="mr-2 h-4 w-4" />
                                    Consultar guardado
                                </Button>

                                <Button
                                    :disabled="!hasDate || isBusy"
                                    @click="syncAutomaticos"
                                >
                                    <Play
                                        v-if="!isBusy"
                                        class="mr-2 h-4 w-4"
                                    />
                                    <Loader2
                                        v-else
                                        class="mr-2 h-4 w-4 animate-spin"
                                    />
                                    {{ status === 'sincronizando' ? 'Sincronizando' : 'Sincronizar ahora' }}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div
                        v-if="errorMessage"
                        class="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
                    >
                        {{ errorMessage }}
                    </div>

                    <Card>
                        <CardHeader>
                            <div class="flex items-center justify-between gap-3">
                                <CardTitle class="text-base">
                                    Datos desde Plataforma
                                </CardTitle>

                                <span
                                    v-if="lastSyncedAt"
                                    class="text-xs text-muted-foreground"
                                >
                                    Sincronizado: {{ lastSyncedAt }}
                                </span>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">
                                        Caja Plataforma
                                    </p>

                                    <p class="text-lg font-semibold">
                                        {{ formatCurrency(automaticos.caja) }}
                                    </p>

                                    <Button
                                        v-if="!showAjusteCaja"
                                        variant="ghost"
                                        size="sm"
                                        class="mt-2 px-0"
                                        :disabled="isBusy"
                                        @click="enableAjusteCaja"
                                    >
                                        <Plus class="mr-1 h-4 w-4" />
                                        Agregar ajuste
                                    </Button>

                                    <div v-else class="mt-3 space-y-2">
                                        <div class="flex items-center gap-2">
                                            <Input
                                                :model-value="moneyInputValue(manuales.ajusteCaja)"
                                                type="number"
                                                step="0.01"
                                                placeholder="Ajuste +/-"
                                                :disabled="isBusy"
                                                @update:model-value="updateMoney('ajusteCaja', String($event))"
                                            />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                :disabled="isBusy"
                                                @click="removeAjusteCaja"
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div class="rounded-md bg-muted p-2 text-xs">
                                            <div>Valor Plataforma: {{ formatCurrency(automaticos.caja) }}</div>
                                            <div>Ajuste manual: {{ formatCurrency(manuales.ajusteCaja) }}</div>
                                            <div class="font-semibold">
                                                Total caja final: {{ formatCurrency(calculados.cajaFinal) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Valores</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.valores) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Fondos</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.fondosFci) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Proveedores</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.proveedores) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Otros OPV Plataforma</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.otrosOpv) }}</p>
                                    <p class="mt-1 text-xs text-muted-foreground">
                                        Se precarga en OPV / Otros y puede ajustarse manualmente.
                                    </p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">
                                        Proveedores a vencer Plataforma
                                    </p>

                                    <p class="text-lg font-semibold">
                                        {{ formatCurrency(automaticos.proveedoresAVencer) }}
                                    </p>

                                    <Button
                                        v-if="!showAjusteProveedores"
                                        variant="ghost"
                                        size="sm"
                                        class="mt-2 px-0"
                                        :disabled="isBusy"
                                        @click="enableAjusteProveedores"
                                    >
                                        <Plus class="mr-1 h-4 w-4" />
                                        Agregar ajuste
                                    </Button>

                                    <div v-else class="mt-3 space-y-2">
                                        <div class="flex items-center gap-2">
                                            <Input
                                                :model-value="moneyInputValue(manuales.ajusteProveedoresAVencer)"
                                                type="number"
                                                step="0.01"
                                                placeholder="Ajuste +/-"
                                                :disabled="isBusy"
                                                @update:model-value="updateMoney('ajusteProveedoresAVencer', String($event))"
                                            />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                :disabled="isBusy"
                                                @click="removeAjusteProveedores"
                                            >
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div class="rounded-md bg-muted p-2 text-xs">
                                            <div>Valor Plataforma: {{ formatCurrency(automaticos.proveedoresAVencer) }}</div>
                                            <div>Ajuste manual: {{ formatCurrency(manuales.ajusteProveedoresAVencer) }}</div>
                                            <div class="font-semibold">
                                                Total proveedores a vencer: {{ formatCurrency(calculados.proveedoresAVencerFinal) }}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Cobranzas</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.cobranzas) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Stock costo reposición</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.stockCostoReposicion) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Acopio mes actual</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.acopioMesActual) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Cuenta corriente clientes</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.cuentaCorrienteClientes) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Ventas netas</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(automaticos.ventasNetas) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Días de caja</p>
                                    <p class="text-lg font-semibold">{{ calculados.diasCaja === null ? '-' : formatNumber(calculados.diasCaja) }}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">
                                Carga manual
                            </CardTitle>
                        </CardHeader>

                        <CardContent class="space-y-4">
                            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                <div class="space-y-2">
                                    <Label>Bancos <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.bancos)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('bancos', String($event))"
                                    />
                                </div>

                                <div class="space-y-2">
                                    <Label>Bancos descubierto <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.bancosDescubierto)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('bancosDescubierto', String($event))"
                                    />
                                    <p class="text-xs text-muted-foreground">
                                        Se carga positivo y el cálculo lo resta.
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>OPV / Otros (manual) <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.opvOtros)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('opvOtros', String($event))"
                                    />
                                    <p class="text-xs text-muted-foreground">
                                        Usá este campo para ajustar o cargar el importe si Plataforma no lo informa.
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Otros pagos / Impuestos proyectados <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.otrosPagosProyectados)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :aria-invalid="Boolean(moneyErrors.otrosPagosProyectados)"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('otrosPagosProyectados', String($event))"
                                    />
                                    <p
                                        v-if="moneyErrors.otrosPagosProyectados"
                                        class="text-xs text-destructive"
                                    >
                                        {{ moneyErrors.otrosPagosProyectados }}
                                    </p>
                                    <p class="text-xs text-muted-foreground">
                                        Pagos previstos para los próximos días. No forman parte del pasivo actual.
                                    </p>
                                </div>

                                <div class="space-y-2">
                                    <Label>Anticipos proveedores <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.anticipos)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('anticipos', String($event))"
                                    />
                                </div>

                                <div class="space-y-2">
                                    <Label>Acopios proveedores <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.acopiosEspeciales)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('acopiosEspeciales', String($event))"
                                    />
                                </div>

                                <div class="space-y-2">
                                    <Label>Acopio al cierre del mes <span class="text-destructive">*</span></Label>
                                    <Input
                                        :model-value="moneyInputValue(manuales.acopioCierreMes)"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        :aria-invalid="Boolean(moneyErrors.acopioCierreMes)"
                                        :disabled="isBusy || !hasDate"
                                        @update:model-value="updateMoney('acopioCierreMes', String($event))"
                                    />
                                    <p
                                        v-if="moneyErrors.acopioCierreMes"
                                        class="text-xs text-destructive"
                                    >
                                        {{ moneyErrors.acopioCierreMes }}
                                    </p>
                                </div>
                            </div>

                            <p class="text-xs text-muted-foreground">
                                <span class="text-destructive">*</span> Datos obligatorios. El tablero se actualizará únicamente después de guardarlos.
                            </p>

                            <div class="space-y-2">
                                <Label>Observación</Label>
                                <Textarea
                                    :model-value="manuales.observacion ?? ''"
                                    placeholder="Ej: carga manual informada por Finanzas..."
                                    :disabled="isBusy || !hasDate"
                                    @update:model-value="manuales.observacion = String($event)"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">
                                Resumen calculado
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Caja final</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.cajaFinal) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Prov. a vencer final</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.proveedoresAVencerFinal) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Total disponibilidades</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.totalDisponibilidades) }}</p>
                                </div>

                                <div class="rounded-lg border p-3">
                                    <p class="text-xs text-muted-foreground">Total pasivos</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.totalPasivos) }}</p>
                                </div>

                                <div
                                    class="rounded-lg border p-3"
                                    :class="(calculados.liquidezNeta ?? 0) < 0 ? 'border-destructive/50 bg-destructive/10' : 'bg-muted/40'"
                                >
                                    <p class="text-xs text-muted-foreground">Liquidez neta</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.liquidezNeta) }}</p>
                                </div>

                                <div class="rounded-lg border bg-muted/40 p-3">
                                    <p class="text-xs text-muted-foreground">Compromisos proyectados</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.compromisosProyectados) }}</p>
                                </div>

                                <div class="rounded-lg border bg-muted/40 p-3">
                                    <p class="text-xs text-muted-foreground">Cobranzas proyectadas · sólo lectura</p>
                                    <p class="text-lg font-semibold">{{ formatCurrency(calculados.cobranzasProyectadas) }}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <SheetFooter class="sticky bottom-0 z-10 border-t bg-background p-5">
                <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                        variant="outline"
                        :disabled="isBusy"
                        @click="closeDrawer"
                    >
                        <X class="mr-2 h-4 w-4" />
                        Cancelar
                    </Button>

                    <Button
                        variant="secondary"
                        :disabled="!hasDate || isBusy"
                        @click="syncAutomaticos"
                    >
                        <RefreshCcw
                            v-if="status !== 'sincronizando'"
                            class="mr-2 h-4 w-4"
                        />
                        <Loader2
                            v-else
                            class="mr-2 h-4 w-4 animate-spin"
                        />
                        Sincronizar
                    </Button>

                    <Button
                        :disabled="!hasDate || isBusy"
                        @click="saveRegistro"
                    >
                        <Save
                            v-if="status !== 'guardando'"
                            class="mr-2 h-4 w-4"
                        />
                        <Loader2
                            v-else
                            class="mr-2 h-4 w-4 animate-spin"
                        />
                        Guardar
                    </Button>
                </div>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
