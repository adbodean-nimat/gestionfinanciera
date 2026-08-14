import axios from 'axios'

import { http } from '@/services/http'

export interface GestionRole {
    id: string
    codigo: string
    nombre: string
    descripcion?: string
}

export interface GestionUsuarioAdmin {
    id: string
    username: string
    nombre: string
    email?: string
    activo: boolean
    roles: GestionRole[]
    ultimoAcceso?: string
}

export interface CrearGestionUsuarioPayload {
    username: string
    activo: boolean
    roles: string[]
}

export class UsuariosApiError extends Error {
    readonly status: number | null

    constructor(message: string, status: number | null = null) {
        super(message)
        this.name = 'UsuariosApiError'
        this.status = status
    }
}

function recordValue(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function stringValue(...values: unknown[]): string | undefined {
    return values.find((value): value is string => typeof value === 'string' && Boolean(value.trim()))?.trim()
}

function unwrapData(value: unknown): unknown {
    const payload = recordValue(value)
    return payload && 'data' in payload ? payload.data : value
}

function normalizeRole(value: unknown): GestionRole | null {
    if (typeof value === 'string') {
        return { id: value, codigo: value, nombre: value }
    }

    const role = recordValue(value)
    if (!role) return null

    const codigo = stringValue(role.codigo, role.code, role.nombre, role.name)
    if (!codigo) return null

    return {
        id: String(role.id ?? codigo),
        codigo,
        nombre: stringValue(role.nombre, role.name) ?? codigo,
        descripcion: stringValue(role.descripcion, role.description),
    }
}

function normalizeRoles(value: unknown): GestionRole[] {
    return Array.isArray(value)
        ? value.map(normalizeRole).filter((role): role is GestionRole => Boolean(role))
        : []
}

function normalizeUser(value: unknown): GestionUsuarioAdmin | null {
    const user = recordValue(value)
    if (!user || user.id === undefined || user.id === null) return null

    const username = stringValue(
        user.sam_account_name,
        user.samAccountName,
        user.username,
        user.usuario,
    )
    if (!username) return null

    return {
        id: String(user.id),
        username,
        nombre: stringValue(
            user.nombre_completo,
            user.displayName,
            user.nombre,
            user.name,
        ) ?? username,
        email: stringValue(user.email, user.mail, user.correo),
        activo: user.activo !== false && user.active !== false,
        roles: normalizeRoles(user.roles),
        ultimoAcceso: stringValue(user.ultimo_acceso, user.ultimoAcceso, user.lastLogin),
    }
}

function normalizeCollection(value: unknown, key: string): unknown[] {
    const data = unwrapData(value)
    if (Array.isArray(data)) return data

    const record = recordValue(data)
    const collection = record?.[key]
    return Array.isArray(collection) ? collection : []
}

function apiError(error: unknown, fallback: string): UsuariosApiError {
    if (!axios.isAxiosError(error)) return new UsuariosApiError(fallback)

    const status = error.response?.status ?? null
    const response = recordValue(error.response?.data)
    const message = stringValue(response?.message, response?.error)

    if (status === 401) return new UsuariosApiError('La sesión expiró. Volvé a iniciar sesión.', status)
    if (status === 403) return new UsuariosApiError('No tenés permisos para administrar usuarios.', status)
    if (status === 409) return new UsuariosApiError(message ?? 'La operación entra en conflicto con el estado actual del usuario.', status)
    if (!error.response) return new UsuariosApiError('No se pudo conectar con el servidor.', null)

    return new UsuariosApiError(message ?? fallback, status)
}

export async function listarUsuarios(): Promise<GestionUsuarioAdmin[]> {
    try {
        const { data } = await http.get('/gestion/admin/usuarios')
        return normalizeCollection(data, 'usuarios')
            .map(normalizeUser)
            .filter((user): user is GestionUsuarioAdmin => Boolean(user))
    } catch (error) {
        throw apiError(error, 'No se pudo obtener la lista de usuarios.')
    }
}

export async function listarRoles(): Promise<GestionRole[]> {
    try {
        const { data } = await http.get('/gestion/admin/roles')
        return normalizeCollection(data, 'roles')
            .map(normalizeRole)
            .filter((role): role is GestionRole => Boolean(role))
    } catch (error) {
        throw apiError(error, 'No se pudo obtener la lista de roles.')
    }
}

export async function crearUsuario(payload: CrearGestionUsuarioPayload): Promise<GestionUsuarioAdmin | null> {
    try {
        const { data } = await http.post('/gestion/admin/usuarios', {
            username: payload.username,
            activo: payload.activo,
            roles: payload.roles,
        })
        return normalizeUser(unwrapData(data))
    } catch (error) {
        throw apiError(error, 'No se pudo agregar el usuario.')
    }
}

export async function cambiarEstadoUsuario(id: string, activo: boolean): Promise<void> {
    try {
        await http.patch(`/gestion/admin/usuarios/${encodeURIComponent(id)}/estado`, { activo })
    } catch (error) {
        throw apiError(error, 'No se pudo cambiar el estado del usuario.')
    }
}

export async function actualizarRolesUsuario(id: string, roles: string[]): Promise<void> {
    try {
        await http.put(`/gestion/admin/usuarios/${encodeURIComponent(id)}/roles`, { roles })
    } catch (error) {
        throw apiError(error, 'No se pudieron actualizar los roles del usuario.')
    }
}
