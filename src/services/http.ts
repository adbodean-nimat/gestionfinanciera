import axios from 'axios'

import { authToken, clearGestionSession, hasValidSession } from '@/services/auth'

export const http = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
})

http.interceptors.request.use((config) => {
    const requestPath = String(config.url ?? '')
    if (requestPath.startsWith('/gestion') && hasValidSession() && authToken.value) {
        config.headers.Authorization = `Bearer ${authToken.value}`
    }

    return config
})

http.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            String(error.config?.url ?? '').startsWith('/gestion')
        ) {
            clearGestionSession()
            window.dispatchEvent(new CustomEvent('gestion-auth:expired'))
        }

        return Promise.reject(error)
    }
)
