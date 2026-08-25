import axios from 'axios'

import { http } from '@/services/http'

export const GESTION_AUTOMATIC_SYNC_KEY = 'gestion_sincronizacion_automatica'

export interface GestionAutomaticSyncConfig {
    activo: boolean
    cron: string
    timezone: string
}

interface ConfigurationEntry {
    clave?: unknown
    valor?: unknown
}

function objectValue(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
}

function parseConfig(value: unknown): GestionAutomaticSyncConfig | null {
    let candidate = value

    if (typeof candidate === 'string') {
        try {
            candidate = JSON.parse(candidate) as unknown
        } catch {
            return null
        }
    }

    const config = objectValue(candidate)
    if (
        !config
        || typeof config.activo !== 'boolean'
        || typeof config.cron !== 'string'
        || typeof config.timezone !== 'string'
    ) {
        return null
    }

    return {
        activo: config.activo,
        cron: config.cron,
        timezone: config.timezone,
    }
}

function findAutomaticSyncConfig(response: unknown): GestionAutomaticSyncConfig | null {
    const envelope = objectValue(response)
    const data = envelope && 'data' in envelope ? envelope.data : response

    if (Array.isArray(data)) {
        const entry = data.find((item) => {
            const candidate = objectValue(item) as ConfigurationEntry | null
            return candidate?.clave === GESTION_AUTOMATIC_SYNC_KEY
        }) as ConfigurationEntry | undefined
        return parseConfig(entry?.valor)
    }

    const dataObject = objectValue(data)
    if (!dataObject) return null

    if (dataObject.clave === GESTION_AUTOMATIC_SYNC_KEY) {
        return parseConfig(dataObject.valor)
    }

    return parseConfig(dataObject[GESTION_AUTOMATIC_SYNC_KEY])
}

function configurationError(error: unknown, fallback: string): Error {
    if (!axios.isAxiosError(error)) return error instanceof Error ? error : new Error(fallback)

    const response = objectValue(error.response?.data)
    if (typeof response?.message === 'string' && response.message.trim()) {
        return new Error(response.message)
    }
    if (error.response?.status === 403) {
        return new Error('No tenés permisos para modificar esta configuración.')
    }
    if (!error.response) return new Error('No hay conexión con el servidor.')
    return new Error(fallback)
}

export async function getGestionAutomaticSyncConfig(
    signal?: AbortSignal
): Promise<GestionAutomaticSyncConfig> {
    try {
        const { data } = await http.get('/gestion/configuracion-general', { signal })
        const config = findAutomaticSyncConfig(data)

        if (!config) {
            throw new Error('La configuración de sincronización automática no está disponible.')
        }

        return config
    } catch (error) {
        throw configurationError(error, 'No se pudo cargar la sincronización automática.')
    }
}

export async function updateGestionAutomaticSyncConfig(
    config: GestionAutomaticSyncConfig
): Promise<void> {
    try {
        await http.put(
            `/gestion/configuracion-general/${GESTION_AUTOMATIC_SYNC_KEY}`,
            { valor: config }
        )
    } catch (error) {
        throw configurationError(error, 'No se pudo guardar la sincronización automática.')
    }
}
