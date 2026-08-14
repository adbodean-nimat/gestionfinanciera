import { readonly, ref } from 'vue'

import { buildGestionAlerts, type GestionAlert } from '@/lib/gestionAlerts'
import { mapGestionListadoToDashboard } from '@/mappers/gestion.mapper'
import { authUser } from '@/services/auth'
import { getGestionListado } from '@/services/gestion.api'

const alerts = ref<GestionAlert[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

let loadedForUser: string | null = null
let loadingForUser: string | null = null
let loadingPromise: Promise<void> | null = null

function currentUserKey() {
    return authUser.value?.username ?? authUser.value?.email ?? null
}

export function setGestionAlerts(nextAlerts: readonly GestionAlert[]) {
    alerts.value = [...nextAlerts]
    error.value = null
    loadedForUser = currentUserKey()
}

export async function loadGestionAlerts(force = false): Promise<void> {
    const userKey = currentUserKey()

    if (!force && loadedForUser === userKey) return
    if (loadingPromise && loadingForUser === userKey) return loadingPromise

    loadingForUser = userKey
    isLoading.value = true
    error.value = null

    loadingPromise = (async () => {
        try {
            const response = await getGestionListado({ limit: 52, offset: 0 })
            const dashboard = mapGestionListadoToDashboard(response.data)

            alerts.value = buildGestionAlerts(dashboard.at(-1))
            loadedForUser = userKey
        } catch (cause) {
            alerts.value = []
            loadedForUser = null
            error.value = cause instanceof Error
                ? cause.message
                : 'No se pudieron consultar las alertas de Gestión Financiera.'
        } finally {
            isLoading.value = false
            loadingForUser = null
            loadingPromise = null
        }
    })()

    return loadingPromise
}

export function useGestionAlerts() {
    return {
        alerts: readonly(alerts),
        isLoading: readonly(isLoading),
        error: readonly(error),
        load: loadGestionAlerts,
    }
}
