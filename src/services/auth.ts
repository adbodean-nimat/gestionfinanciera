import axios from 'axios'
import { computed, ref } from 'vue'

const TOKEN_KEY = 'gestionToken'
const SESSION_KEY = 'gestionSession'
const ACCESS_DENIED_MESSAGE =
    'Tu usuario no está habilitado para ingresar al tablero de Gestión Financiera.'

export type GestionPermission =
    | 'gestion.consultar'
    | 'gestion.editar'
    | 'gestion.configurar'
    | 'gestion.administrar_usuarios'

export interface AuthUser {
    username: string
    displayName?: string
    name?: string
    givenName?: string
    surname?: string
    email?: string
    groups: string[]
    avatarUrl?: string
}

interface StoredGestionSession {
    user: AuthUser
    roles: string[]
    permissions: string[]
    iat?: number
    exp?: number
}

interface AuthApiPayload {
    user?: unknown
    usuario?: unknown
    avatar?: unknown
    token?: unknown
    access_token?: unknown
    accessToken?: unknown
    roles?: unknown
    permissions?: unknown
    permisos?: unknown
    iat?: unknown
    exp?: unknown
    data?: unknown
}

interface ErrorPayload {
    code?: unknown
    message?: unknown
    error?: unknown
}

export class GestionAuthError extends Error {
    readonly status: number | null
    readonly code: string | null

    constructor(message: string, status: number | null = null, code: string | null = null) {
        super(message)
        this.name = 'GestionAuthError'
        this.status = status
        this.code = code
    }
}

function apiUrl(path: string): string {
    const apiBase = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
    return apiBase ? `${apiBase}${path}` : `/api${path}`
}

function stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? [...new Set(value.filter((item): item is string => typeof item === 'string'))]
        : []
}

function objectValue(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : null
}

function unwrapPayload(value: unknown): AuthApiPayload {
    const payload = objectValue(value) as AuthApiPayload | null
    if (!payload) return {}
    const nested = objectValue(payload.data)
    return nested ? { ...payload, ...nested } : payload
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payload = token.split('.')[1]
        if (!payload) return null

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
        const bytes = Uint8Array.from(window.atob(padded), (character) => character.charCodeAt(0))
        const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown
        return objectValue(decoded)
    } catch {
        return null
    }
}

function avatarDataUrl(value: unknown): string | undefined {
    const avatar = stringValue(value)
    if (!avatar) return undefined
    if (avatar.startsWith('data:image/')) return avatar

    const mimeType = avatar.startsWith('iVBOR') ? 'image/png' : 'image/jpeg'
    return `data:${mimeType};base64,${avatar}`
}

function buildUser(candidate: unknown, fallbackUsername = '', avatar?: unknown): AuthUser {
    const user = objectValue(candidate) ?? {}
    return {
        username:
            stringValue(user.sAMAccountName) ??
            stringValue(user.username) ??
            stringValue(user.usuario) ??
            fallbackUsername,
        displayName:
            stringValue(user.displayName) ??
            stringValue(user.nombre) ??
            stringValue(user.name) ??
            undefined,
        name: stringValue(user.name) ?? undefined,
        givenName: stringValue(user.givenName) ?? undefined,
        surname: stringValue(user.sn) ?? undefined,
        email: stringValue(user.mail) ?? stringValue(user.email) ?? undefined,
        groups: stringArray(user.memberOf),
        avatarUrl: avatarDataUrl(avatar ?? user.avatar),
    }
}

function readStoredSession(): StoredGestionSession | null {
    try {
        const value = window.sessionStorage.getItem(SESSION_KEY)
        return value ? (JSON.parse(value) as StoredGestionSession) : null
    } catch {
        return null
    }
}

function readStoredToken(): string | null {
    try {
        return window.sessionStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

function tokenHasExpired(token: string): boolean {
    const expiration = numberValue(decodeJwtPayload(token)?.exp)
    return expiration !== null && Date.now() >= expiration * 1000
}

function extractToken(payload: AuthApiPayload): string | null {
    return (
        stringValue(payload.token) ??
        stringValue(payload.access_token) ??
        stringValue(payload.accessToken)
    )
}

const storedToken = readStoredToken()
const storedSession = readStoredSession()
const initialToken = storedToken && !tokenHasExpired(storedToken) ? storedToken : null

export const authToken = ref<string | null>(initialToken)
export const authUser = ref<AuthUser | null>(initialToken ? storedSession?.user ?? null : null)
export const authRoles = ref<string[]>(initialToken ? storedSession?.roles ?? [] : [])
export const authPermissions = ref<string[]>(
    initialToken ? storedSession?.permissions ?? [] : []
)
export const authIssuedAt = ref<number | null>(initialToken ? storedSession?.iat ?? null : null)
export const authExpiresAt = ref<number | null>(initialToken ? storedSession?.exp ?? null : null)
export const isAuthenticated = computed(() => Boolean(authToken.value))
export const isGestionSessionReady = ref(false)

let expirationTimer: ReturnType<typeof window.setTimeout> | null = null
let restorePromise: Promise<boolean> | null = null

function persistSession() {
    if (!authToken.value || !authUser.value) return

    window.sessionStorage.setItem(TOKEN_KEY, authToken.value)
    window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            user: authUser.value,
            roles: authRoles.value,
            permissions: authPermissions.value,
            iat: authIssuedAt.value ?? undefined,
            exp: authExpiresAt.value ?? undefined,
        } satisfies StoredGestionSession)
    )
}

function applyProfile(payloadValue: unknown, fallbackUsername = '') {
    const payload = unwrapPayload(payloadValue)
    const claims = authToken.value ? decodeJwtPayload(authToken.value) : null
    const claimsUser = claims?.user ?? claims?.usuario
    const previousUser = authUser.value
    const user = buildUser(
        payload.user ?? payload.usuario ?? claimsUser,
        fallbackUsername || previousUser?.username,
        payload.avatar
    )

    authUser.value = {
        ...previousUser,
        ...user,
        avatarUrl: user.avatarUrl ?? previousUser?.avatarUrl,
    }
    authRoles.value = stringArray(payload.roles).length
        ? stringArray(payload.roles)
        : stringArray(claims?.roles)
    authPermissions.value = stringArray(payload.permissions ?? payload.permisos).length
        ? stringArray(payload.permissions ?? payload.permisos)
        : stringArray(claims?.permissions ?? claims?.permisos)
    authIssuedAt.value = numberValue(payload.iat) ?? numberValue(claims?.iat)
    authExpiresAt.value = numberValue(payload.exp) ?? numberValue(claims?.exp)
    persistSession()
}

function scheduleExpiration() {
    if (expirationTimer !== null) window.clearTimeout(expirationTimer)
    expirationTimer = null
    if (!authToken.value) return

    const expiration = authExpiresAt.value ?? numberValue(decodeJwtPayload(authToken.value)?.exp)
    if (expiration === null) return

    const remaining = expiration * 1000 - Date.now()
    if (remaining <= 0) {
        clearGestionSession()
        return
    }

    expirationTimer = window.setTimeout(() => {
        if (authToken.value && !tokenHasExpired(authToken.value)) {
            scheduleExpiration()
            return
        }

        clearGestionSession()
        window.dispatchEvent(new CustomEvent('gestion-auth:expired'))
    }, Math.min(remaining, 2_147_483_647))
}

export function hasPermission(permission: GestionPermission | string): boolean {
    return authPermissions.value.includes(permission)
}

export function hasValidSession(): boolean {
    if (!authToken.value || tokenHasExpired(authToken.value)) {
        if (authToken.value) clearGestionSession()
        return false
    }
    return true
}

export async function login(username: string, password: string): Promise<void> {
    try {
        const { data } = await axios.post(apiUrl('/gestion/login'), { username, password })
        const payload = unwrapPayload(data)
        const token = extractToken(payload)

        if (!token) {
            throw new GestionAuthError('La respuesta del servidor no incluyó un token de acceso.')
        }
        if (tokenHasExpired(token)) {
            throw new GestionAuthError('El servidor devolvió una sesión vencida.', 401)
        }

        authToken.value = token
        applyProfile(payload, username)
        scheduleExpiration()

        const restored = await restoreGestionSession(true)
        if (!restored) {
            throw new GestionAuthError('No se pudo validar la sesión de Gestión Financiera.', 401)
        }
    } catch (error) {
        if (error instanceof GestionAuthError) {
            clearGestionSession()
            throw error
        }
        if (!axios.isAxiosError(error)) {
            clearGestionSession()
            throw error
        }

        clearGestionSession()
        const status = error.response?.status ?? null
        const response = objectValue(error.response?.data) as ErrorPayload | null
        const code = stringValue(response?.code)

        if (status === 403 && code === 'GESTION_ACCESS_DENIED') {
            throw new GestionAuthError(ACCESS_DENIED_MESSAGE, status, code)
        }
        if (status === 401) {
            throw new GestionAuthError(
                'El usuario o la contraseña de Windows no son correctos.',
                status,
                code
            )
        }
        if (!error.response) {
            throw new GestionAuthError('No se pudo conectar con el servidor de autenticación.')
        }

        const message = stringValue(response?.message) ?? stringValue(response?.error)
        throw new GestionAuthError(
            message ?? 'No se pudo iniciar sesión. Intentá nuevamente.',
            status,
            code
        )
    }
}

export async function restoreGestionSession(force = false): Promise<boolean> {
    if (!hasValidSession()) {
        isGestionSessionReady.value = true
        return false
    }
    if (isGestionSessionReady.value && !force) {
        return hasPermission('gestion.consultar')
    }
    if (restorePromise && !force) return restorePromise

    restorePromise = (async () => {
        try {
            const { data } = await axios.get(apiUrl('/gestion/me'), {
                headers: { Authorization: `Bearer ${authToken.value}` },
            })
            applyProfile(data)
            scheduleExpiration()
            isGestionSessionReady.value = true
            return hasPermission('gestion.consultar')
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status !== 401) {
                authRoles.value = []
                authPermissions.value = []
                isGestionSessionReady.value = true
                return false
            }

            clearGestionSession()
            isGestionSessionReady.value = true
            return false
        } finally {
            restorePromise = null
        }
    })()

    return restorePromise
}

export function clearGestionSession(): void {
    try {
        window.sessionStorage.removeItem(TOKEN_KEY)
        window.sessionStorage.removeItem(SESSION_KEY)
    } finally {
        authToken.value = null
        authUser.value = null
        authRoles.value = []
        authPermissions.value = []
        authIssuedAt.value = null
        authExpiresAt.value = null
        isGestionSessionReady.value = false
        if (expirationTimer !== null) window.clearTimeout(expirationTimer)
        expirationTimer = null
    }
}

// Alias conservado para los componentes existentes. Solo cierra la sesión de Gestión.
export const logout = clearGestionSession

if (!initialToken && storedToken) clearGestionSession()
scheduleExpiration()
