import { computed, onUnmounted, reactive, ref, watch } from 'vue'

import {
    actualizarGestion,
    crearGestion,
    getGestionAutomaticos,
    getGestionListado,
    getGestionPorFecha,
} from '@/services/gestion.api'
import { buildPeriodoEtiqueta } from '@/mappers/gestion.mapper'
import {
    calcularGestion,
    esGestionGuardada,
    emptyAutomaticos,
    emptyManuales,
    type GestionAutomaticos,
    type GestionCalculados,
    type GestionEstadoCarga,
    type GestionManuales,
    type GestionRegistro,
    type GestionSavePayload,
} from '@/types/gestion'

const requiredManualFields: Array<{
    field: Exclude<keyof GestionManuales, 'observacion'>
    label: string
}> = [
    { field: 'bancos', label: 'Bancos' },
    { field: 'bancosDescubierto', label: 'Bancos descubierto' },
    { field: 'opvOtros', label: 'Otros / Otros (Manual)' },
    { field: 'otrosPagosProyectados', label: 'Otros pagos / Impuestos proyectados' },
    { field: 'anticipos', label: 'Anticipos proveedores' },
    { field: 'acopiosEspeciales', label: 'Acopios proveedores' },
    { field: 'acopioCierreMes', label: 'Acopio al cierre del mes' },
]

function missingRequiredManualFields(manuales: GestionManuales): string[] {
    return requiredManualFields
        .filter(({ field }) => manuales[field] === null)
        .map(({ label }) => label)
}

function messageFrom(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
}

export function useGestionListado() {
    const registros = ref<GestionRegistro[]>([])
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const paginationTotal = ref(0)

    let controller: AbortController | null = null
    let requestId = 0

    async function load() {
        controller?.abort()
        controller = new AbortController()
        const currentRequest = ++requestId

        isLoading.value = true
        error.value = null

        try {
            const response = await getGestionListado(
                { estado: 'GUARDADO', limit: 52, offset: 0 },
                controller.signal
            )

            if (currentRequest !== requestId) return

            registros.value = response.data
            paginationTotal.value = response.pagination.total
        } catch (cause) {
            if (currentRequest !== requestId || controller.signal.aborted) return
            error.value = messageFrom(cause, 'No se pudo consultar el histórico guardado.')
        } finally {
            if (currentRequest === requestId) {
                isLoading.value = false
            }
        }
    }

    onUnmounted(() => controller?.abort())

    return {
        registros,
        isLoading,
        error,
        paginationTotal,
        load,
    }
}

export function useGestionDrawer() {
    const selectedDate = ref('')
    const existingRecord = ref<GestionRegistro | null>(null)
    const automaticos = reactive<GestionAutomaticos>(emptyAutomaticos())
    const manuales = reactive<GestionManuales>(emptyManuales())
    const sincronizadoEn = ref<string | null>(null)
    const cobranzasProyectadas = ref<number | null>(null)

    const isCheckingDate = ref(false)
    const isSyncing = ref(false)
    const isSaving = ref(false)
    const checkError = ref<string | null>(null)
    const syncError = ref<string | null>(null)
    const saveError = ref<string | null>(null)
    const steadyStatus = ref<GestionEstadoCarga>('sin_fecha')

    const initialSnapshot = ref('')
    let dateController: AbortController | null = null
    let dateRequestId = 0
    let applyingData = false

    const recordExists = computed(
        () => existingRecord.value?.existeEnPostgres === true
    )
    const hasDate = computed(() => selectedDate.value.trim().length > 0)

    function serializeCurrent() {
        return JSON.stringify({
            fecha: selectedDate.value,
            automaticos,
            manuales,
            sincronizadoEn: sincronizadoEn.value,
        })
    }

    function takeSnapshot() {
        initialSnapshot.value = serializeCurrent()
    }

    const hasUnsavedChanges = computed(() => {
        return initialSnapshot.value !== '' && serializeCurrent() !== initialSnapshot.value
    })

    const localCalculados = computed<GestionCalculados>(() => ({
        ...calcularGestion(automaticos, manuales),
        cobranzasProyectadas: cobranzasProyectadas.value,
    }))

    const calculados = computed<GestionCalculados>(() => {
        if (existingRecord.value && !hasUnsavedChanges.value) {
            return existingRecord.value.calculados
        }

        return localCalculados.value
    })

    const status = computed<GestionEstadoCarga>(() => {
        if (!hasDate.value) return 'sin_fecha'
        if (isCheckingDate.value) return 'consultando'
        if (isSyncing.value) return 'sincronizando'
        if (isSaving.value) return 'guardando'
        if (checkError.value || syncError.value || saveError.value) return 'error'
        return steadyStatus.value
    })

    const isBusy = computed(
        () => isCheckingDate.value || isSyncing.value || isSaving.value
    )

    const errorMessage = computed(
        () => checkError.value ?? syncError.value ?? saveError.value
    )

    const lastSavedAt = computed(() => existingRecord.value?.guardadoEn ?? null)

    function clearErrors() {
        checkError.value = null
        syncError.value = null
        saveError.value = null
    }

    function resetData() {
        applyingData = true
        Object.assign(automaticos, emptyAutomaticos())
        Object.assign(manuales, emptyManuales())
        existingRecord.value = null
        sincronizadoEn.value = null
        cobranzasProyectadas.value = null
        applyingData = false
    }

    function resetDrawer() {
        dateController?.abort()
        dateRequestId += 1
        selectedDate.value = ''
        resetData()
        clearErrors()
        initialSnapshot.value = ''
        steadyStatus.value = 'sin_fecha'
    }

    function applyRegistro(registro: GestionRegistro) {
        applyingData = true
        Object.assign(automaticos, registro.automaticos)
        Object.assign(manuales, registro.manuales)
        existingRecord.value = registro
        sincronizadoEn.value = registro.sincronizadoEn
        cobranzasProyectadas.value = registro.calculados.cobranzasProyectadas
        applyingData = false
        steadyStatus.value = esGestionGuardada(registro)
            ? 'guardado'
            : 'sincronizado'
        takeSnapshot()
    }

    async function checkSelectedDate() {
        if (!hasDate.value) return

        dateController?.abort()
        dateController = new AbortController()
        const currentRequest = ++dateRequestId

        checkError.value = null
        isCheckingDate.value = true

        try {
            const registro = await getGestionPorFecha(
                selectedDate.value,
                dateController.signal
            )

            if (currentRequest !== dateRequestId) return

            if (registro) {
                applyRegistro(registro)
            } else {
                resetData()
                steadyStatus.value = 'sin_sincronizar'
                takeSnapshot()
            }
        } catch (cause) {
            if (currentRequest !== dateRequestId || dateController.signal.aborted) return
            checkError.value = messageFrom(
                cause,
                'No se pudo consultar el registro guardado.'
            )
            steadyStatus.value = 'error'
        } finally {
            if (currentRequest === dateRequestId) {
                isCheckingDate.value = false
            }
        }
    }

    async function changeDate(nextDate: string): Promise<boolean> {
        if (nextDate === selectedDate.value) return true

        if (
            hasUnsavedChanges.value &&
            !window.confirm(
                'Hay cambios sin guardar. Si cambiás la fecha, se perderán los cambios actuales. ¿Querés continuar?'
            )
        ) {
            return false
        }

        dateController?.abort()
        dateRequestId += 1
        clearErrors()
        selectedDate.value = nextDate
        resetData()

        if (!nextDate) {
            steadyStatus.value = 'sin_fecha'
            initialSnapshot.value = ''
            return true
        }

        steadyStatus.value = 'sin_sincronizar'
        takeSnapshot()
        await checkSelectedDate()
        return true
    }

    async function syncAutomaticos() {
        if (!hasDate.value || isBusy.value) return false

        syncError.value = null
        isSyncing.value = true

        try {
            const fecha = selectedDate.value
            const fechaAnterior = new Date(`${fecha}T00:00:00Z`)
            fechaAnterior.setUTCDate(fechaAnterior.getUTCDate() - 7)
            const [registro, registroAnterior] = await Promise.all([
                getGestionAutomaticos(fecha),
                getGestionPorFecha(fechaAnterior.toISOString().slice(0, 10)),
            ])

            if (selectedDate.value !== fecha) return false

            applyingData = true
            Object.assign(automaticos, registro.automaticos)
            if (
                manuales.opvOtros === null &&
                registro.automaticos.otrosOpv !== null
            ) {
                manuales.opvOtros = registro.automaticos.otrosOpv
            }
            if (
                manuales.acopioCierreMes === null &&
                registro.automaticos.acopioCierreMes !== null
            ) {
                manuales.acopioCierreMes =
                    registro.automaticos.acopioCierreMes
            }
            sincronizadoEn.value = registro.sincronizadoEn
            cobranzasProyectadas.value =
                registroAnterior?.automaticos.ventasNetas ?? null
            applyingData = false
            steadyStatus.value = 'sincronizado'
            return true
        } catch (cause) {
            syncError.value = messageFrom(cause, 'No se pudo consultar Plataforma.')
            steadyStatus.value = 'error'
            return false
        } finally {
            isSyncing.value = false
        }
    }

    function assertFiniteValues() {
        const values = [
            ...Object.values(automaticos),
            ...Object.entries(manuales)
                .filter(([key]) => key !== 'observacion')
                .map(([, value]) => value),
        ]

        if (
            values.some(
                (value) => value !== null && !Number.isFinite(Number(value))
            )
        ) {
            throw new Error('Revisá los importes: hay un valor numérico inválido.')
        }

        const nonNegativeFields: Array<keyof GestionManuales> = [
            'bancos',
            'bancosDescubierto',
            'opvOtros',
            'otrosPagosProyectados',
            'anticipos',
            'acopiosEspeciales',
            'acopioCierreMes',
        ]

        if (
            nonNegativeFields.some((field) => {
                const value = manuales[field]
                return typeof value === 'number' && value < 0
            })
        ) {
            throw new Error(
                'Bancos, descubierto, OPV/Otros, otros pagos proyectados, anticipos y acopios no pueden ser negativos.'
            )
        }
    }

    function assertRequiredManualValues() {
        const missingFields = missingRequiredManualFields(manuales)
        if (!missingFields.length) return

        throw new Error(
            `Completá los datos obligatorios antes de guardar: ${missingFields.join(', ')}.`
        )
    }

    function buildPayload(): GestionSavePayload {
        assertFiniteValues()
        assertRequiredManualValues()
        const { otrosOpv: _otrosOpv, ...automaticosPersistibles } = automaticos

        return {
            fecha: selectedDate.value,
            semana:
                existingRecord.value?.semana ??
                buildPeriodoEtiqueta(selectedDate.value),
            estado: 'GUARDADO',
            sincronizadoEn: sincronizadoEn.value,
            automaticos: automaticosPersistibles,
            manuales: { ...manuales },
        }
    }

    async function saveRegistro(): Promise<GestionRegistro | null> {
        if (!hasDate.value || isBusy.value) return null

        saveError.value = null
        isSaving.value = true

        try {
            const payload = buildPayload()

            if (recordExists.value) {
                await actualizarGestion(selectedDate.value, payload)
            } else {
                await crearGestion(payload)
            }

            const confirmed = await getGestionPorFecha(selectedDate.value)

            if (!confirmed) {
                throw new Error(
                    'Los datos se guardaron, pero no se pudo recuperar el registro actualizado.'
                )
            }

            applyRegistro(confirmed)
            if (!esGestionGuardada(confirmed)) {
                throw new Error(
                    `El servidor recibió el guardado, pero el registro sigue en estado ${confirmed.estado ?? 'sin confirmar'}. El tablero no se actualizará hasta que el backend lo marque GUARDADO.`
                )
            }
            return confirmed
        } catch (cause) {
            saveError.value = messageFrom(cause, 'No se pudieron guardar los datos.')
            steadyStatus.value = 'error'
            return null
        } finally {
            isSaving.value = false
        }
    }

    watch(
        manuales,
        () => {
            if (!applyingData && hasDate.value) {
                steadyStatus.value = 'modificado'
                saveError.value = null
            }
        },
        { deep: true }
    )

    onUnmounted(() => dateController?.abort())

    return {
        selectedDate,
        existingRecord,
        automaticos,
        manuales,
        calculados,
        sincronizadoEn,
        lastSavedAt,
        isCheckingDate,
        isSyncing,
        isSaving,
        isBusy,
        hasDate,
        hasUnsavedChanges,
        checkError,
        syncError,
        saveError,
        errorMessage,
        recordExists,
        status,
        steadyStatus,
        changeDate,
        checkSelectedDate,
        syncAutomaticos,
        saveRegistro,
        resetDrawer,
        clearErrors,
    }
}
