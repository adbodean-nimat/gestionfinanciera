<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-vue-next'

import GestionThemeToggle from '@/components/gestion/GestionThemeToggle.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const canSubmit = computed(
    () => username.value.trim().length > 0 && password.value.length > 0 && !isSubmitting.value
)

function focusPassword() {
    void nextTick(() => document.querySelector<HTMLInputElement>('#password')?.focus())
}

async function submitLogin() {
    if (!canSubmit.value) return

    isSubmitting.value = true
    errorMessage.value = ''

    try {
        await login(username.value.trim(), password.value)
        const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
            ? route.query.redirect
            : '/tablero-01'
        await router.replace(redirect)
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : 'No se pudo iniciar sesión.'
        password.value = ''
        focusPassword()
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <main class="relative min-h-screen overflow-hidden bg-[#f4f7f5] dark:bg-background">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(0,134,69,0.13),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(15,23,42,0.08),transparent_36%)]" />
        <div class="pointer-events-none absolute -left-32 top-1/2 size-96 -translate-y-1/2 rounded-full border border-emerald-700/10" />
        <div class="pointer-events-none absolute -left-20 top-1/2 size-96 -translate-y-1/2 rounded-full border border-emerald-700/10" />

        <header class="relative z-10 flex h-20 items-center justify-between px-6 sm:px-10">
            <img src="/nimat-logo.svg" alt="Nimat — Materiales para la construcción" class="h-12 w-auto">
            <GestionThemeToggle compact />
        </header>

        <section class="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-12 px-6 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
            <div class="hidden max-w-xl lg:block">
                <div class="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-700/15 bg-white/70 px-3 py-1.5 text-xs font-medium text-emerald-800 shadow-sm backdrop-blur dark:bg-card/70 dark:text-emerald-300">
                    <ShieldCheck class="size-4" />
                    Acceso corporativo seguro
                </div>
                <h1 class="text-5xl font-semibold leading-[1.08] tracking-tight text-slate-950 dark:text-foreground">
                    Tu información de gestión,
                    <span class="text-emerald-700 dark:text-emerald-400">en un solo lugar.</span>
                </h1>
                <p class="mt-6 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-muted-foreground">
                    Ingresá con tus credenciales de Windows para consultar el tablero financiero de NIMAT.
                </p>
                <div class="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-muted-foreground">
                    <span class="flex size-10 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/15">
                        <LockKeyhole class="size-5" />
                    </span>
                    <span>La contraseña se envía únicamente al servidor de autenticación.</span>
                </div>
            </div>

            <Card class="mx-auto w-full max-w-md border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-border dark:bg-card/90">
                <CardHeader class="space-y-3 px-7 pt-8 sm:px-9 sm:pt-10">
                    <div class="flex size-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-800/20 lg:hidden">
                        <LockKeyhole class="size-5" />
                    </div>
                    <CardTitle class="text-2xl tracking-tight">Bienvenido</CardTitle>
                    <CardDescription class="text-sm leading-relaxed">
                        Usá el mismo usuario y contraseña con los que iniciás sesión en Windows.
                    </CardDescription>
                </CardHeader>

                <CardContent class="px-7 pb-8 sm:px-9 sm:pb-10">
                    <form class="space-y-5" novalidate @submit.prevent="submitLogin">
                        <Alert v-if="errorMessage" variant="destructive" aria-live="polite">
                            <AlertCircle />
                            <AlertDescription>{{ errorMessage }}</AlertDescription>
                        </Alert>

                        <div class="space-y-2">
                            <Label for="username">Usuario de Windows</Label>
                            <div class="relative">
                                <UserRound class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="username"
                                    v-model="username"
                                    name="username"
                                    autocomplete="username"
                                    autocapitalize="none"
                                    spellcheck="false"
                                    placeholder="Usuario"
                                    class="h-11 pl-10"
                                    :disabled="isSubmitting"
                                    required
                                    autofocus
                                />
                            </div>
                        </div>

                        <div class="space-y-2">
                            <Label for="password">Contraseña</Label>
                            <div class="relative">
                                <LockKeyhole class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    v-model="password"
                                    name="password"
                                    :type="showPassword ? 'text' : 'password'"
                                    autocomplete="current-password"
                                    placeholder="Ingresá tu contraseña"
                                    class="h-11 px-10"
                                    :disabled="isSubmitting"
                                    required
                                />
                                <button
                                    type="button"
                                    class="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                                    :disabled="isSubmitting"
                                    @click="showPassword = !showPassword"
                                >
                                    <EyeOff v-if="showPassword" class="size-4" />
                                    <Eye v-else class="size-4" />
                                </button>
                            </div>
                        </div>

                        <Button type="submit" class="h-11 w-full bg-emerald-700 hover:bg-emerald-800" :disabled="!canSubmit">
                            <LoaderCircle v-if="isSubmitting" class="mr-2 size-4 animate-spin" />
                            <template v-if="isSubmitting">Validando credenciales…</template>
                            <template v-else>
                                Ingresar al tablero
                                <ArrowRight class="ml-2 size-4" />
                            </template>
                        </Button>
                    </form>

                    <p class="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
                        Si no podés ingresar, verificá tu conexión a la red corporativa o contactá a Sistemas.
                    </p>
                </CardContent>
            </Card>
        </section>
    </main>
</template>
