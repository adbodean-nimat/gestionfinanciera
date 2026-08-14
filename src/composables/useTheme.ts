import { readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'gestion-finanzas:theme'
const theme = ref<Theme>('light')

function getPreferredTheme(): Theme {
    if (typeof window === 'undefined') return 'light'

    try {
        const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme
        }
    } catch {
        // Se usa la preferencia del sistema si el almacenamiento no está disponible.
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

function applyTheme(nextTheme: Theme) {
    theme.value = nextTheme

    if (typeof document === 'undefined') return

    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    document.documentElement.style.colorScheme = nextTheme
}

export function initializeTheme() {
    applyTheme(getPreferredTheme())
}

export function useTheme() {
    function setTheme(nextTheme: Theme) {
        applyTheme(nextTheme)

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
        } catch {
            // El tema sigue funcionando aunque el navegador bloquee el guardado local.
        }
    }

    function toggleTheme() {
        const nextTheme = theme.value === 'dark' ? 'light' : 'dark'
        setTheme(nextTheme)
    }

    return {
        theme: readonly(theme),
        setTheme,
        toggleTheme,
    }
}
