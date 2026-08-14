import axios from 'axios'

import { http } from '@/services/http'
import type {
    GestionAutomaticosResponse,
    GestionAutomaticosSincronizados,
    GestionListadoParams,
    GestionListadoResponse,
    GestionRegistro,
    GestionSavePayload,
    GestionSingleResponse,
} from '@/types/gestion'
import { normalizarGestionAutomaticos } from '@/types/gestion'

export class GestionApiError extends Error {
    readonly status: number | null

    constructor(message: string, status: number | null = null) {
        super(message)
        this.name = 'GestionApiError'
        this.status = status
    }
}

function safeApiMessage(error: unknown, fallback: string): GestionApiError {
    if (!axios.isAxiosError(error)) {
        return new GestionApiError(fallback)
    }

    if (error.code === 'ERR_CANCELED') {
        return new GestionApiError('La solicitud fue cancelada.')
    }

    const status = error.response?.status ?? null

    if (status === 401) {
        return new GestionApiError('La sesión expiró. Volvé a iniciar sesión.', status)
    }

    if (status === 403) {
        const responseData = error.response?.data as { code?: unknown; message?: unknown } | undefined
        if (responseData?.code === 'GESTION_ACCESS_DENIED') {
            return new GestionApiError(
                'Tu usuario no está habilitado para ingresar al tablero de Gestión Financiera.',
                status
            )
        }

        return new GestionApiError(
            typeof responseData?.message === 'string'
                ? responseData.message
                : 'No tenés permisos para realizar esta acción.',
            status
        )
    }

    if (status === 409) {
        return new GestionApiError('El registro ya existe.', status)
    }

    if (!error.response) {
        return new GestionApiError('No hay conexión con el servidor.', null)
    }

    const responseData = error.response.data
    if (responseData && typeof responseData === 'object') {
        const apiResponse = responseData as {
            message?: unknown
            errors?: unknown
        }
        if (typeof apiResponse.message === 'string' && apiResponse.message.trim()) {
            const details = Array.isArray(apiResponse.errors)
                ? apiResponse.errors
                      .filter(
                          (detail): detail is { field?: string; message: string } =>
                              Boolean(
                                  detail &&
                                      typeof detail === 'object' &&
                                      typeof (detail as { message?: unknown }).message ===
                                          'string'
                              )
                      )
                      .slice(0, 3)
                      .map((detail) =>
                          detail.field
                              ? `${detail.field}: ${detail.message}`
                              : detail.message
                      )
                : []
            const message = details.length
                ? `${apiResponse.message}. ${details.join(' · ')}`
                : apiResponse.message
            return new GestionApiError(message, status)
        }
    }

    return new GestionApiError(fallback, status)
}

function unwrap<T>(response: { ok: boolean; data: T }, fallback: string): T {
    if (!response.ok) {
        throw new GestionApiError(fallback)
    }

    return response.data
}

export async function getGestionAutomaticos(
    fecha: string,
    signal?: AbortSignal
): Promise<GestionAutomaticosSincronizados> {
    try {
        const { data } = await http.get<GestionAutomaticosResponse>('/gestion/automaticos', {
            params: { fecha },
            signal,
        })

        return normalizarGestionAutomaticos(
            unwrap(data, 'No se pudo consultar Plataforma.')
        )
    } catch (error) {
        if (error instanceof GestionApiError) throw error
        throw safeApiMessage(error, 'No se pudo consultar Plataforma.')
    }
}

export async function getGestionPorFecha(
    fecha: string,
    signal?: AbortSignal
): Promise<GestionRegistro | null> {
    try {
        const { data } = await http.get<GestionSingleResponse>(
            `/gestion/${encodeURIComponent(fecha)}`,
            { signal }
        )

        return unwrap(data, 'No se pudo consultar el registro guardado.')
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null
        }

        if (error instanceof GestionApiError) throw error
        throw safeApiMessage(error, 'No se pudo consultar el registro guardado.')
    }
}

export async function getGestionListado(
    params: GestionListadoParams = {},
    signal?: AbortSignal
): Promise<GestionListadoResponse> {
    try {
        const { data } = await http.get<GestionListadoResponse>('/gestion', {
            params,
            signal,
        })

        if (!data.ok) {
            throw new GestionApiError('No se pudo consultar el histórico guardado.')
        }

        return data
    } catch (error) {
        if (error instanceof GestionApiError) throw error
        throw safeApiMessage(error, 'No se pudo consultar el histórico guardado.')
    }
}

export async function crearGestion(payload: GestionSavePayload): Promise<GestionRegistro> {
    try {
        const { data } = await http.post<GestionSingleResponse>('/gestion', payload)
        return unwrap(data, 'No se pudieron guardar los datos.')
    } catch (error) {
        if (error instanceof GestionApiError) throw error
        throw safeApiMessage(error, 'No se pudieron guardar los datos.')
    }
}

export async function actualizarGestion(
    fecha: string,
    payload: GestionSavePayload
): Promise<GestionRegistro> {
    try {
        const { data } = await http.put<GestionSingleResponse>(
            `/gestion/${encodeURIComponent(fecha)}`,
            payload
        )

        return unwrap(data, 'No se pudieron guardar los datos.')
    } catch (error) {
        if (error instanceof GestionApiError) throw error
        throw safeApiMessage(error, 'No se pudieron guardar los datos.')
    }
}
