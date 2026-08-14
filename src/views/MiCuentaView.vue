<script setup lang="ts">
import { computed } from 'vue'
import { BriefcaseBusiness, Mail, UserRound } from 'lucide-vue-next'

import GestionDashboard01Layout from '@/components/gestion/GestionDashboard01Layout.vue'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { authRoles, authUser } from '@/services/auth'

const fullName = computed(() => {
    const user = authUser.value
    if (!user) return 'Usuario'

    return user.displayName
        || user.name
        || [user.givenName, user.surname].filter(Boolean).join(' ')
        || user.username
        || 'Usuario'
})

const accountDetails = computed(() => [
    {
        label: 'Usuario',
        value: authUser.value?.username || 'No informado',
        icon: UserRound,
    },
    {
        label: 'Correo corporativo',
        value: authUser.value?.email || 'No informado',
        icon: Mail,
    },
])
</script>

<template>
    <GestionDashboard01Layout page-title="Mi cuenta">
        <section class="mx-auto w-full max-w-4xl" aria-labelledby="account-title">
            <div class="mb-6">
                <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Perfil corporativo
                </p>
                <h1 id="account-title" class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Mi cuenta
                </h1>
                <p class="mt-2 text-sm text-muted-foreground">
                    Datos asociados a tu acceso al tablero de Gestión Financiera.
                </p>
            </div>

            <Card class="overflow-hidden">
                <div class="h-1.5 bg-emerald-700" />
                <CardHeader class="gap-5 sm:flex-row sm:items-center">
                    <img
                        :src="authUser?.avatarUrl || '/nimat-avatar.png'"
                        :alt="`Avatar de ${fullName}`"
                        class="size-20 rounded-full border bg-muted object-cover shadow-sm"
                    >
                    <div class="min-w-0 space-y-2">
                        <div>
                            <CardTitle class="truncate text-xl sm:text-2xl">{{ fullName }}</CardTitle>
                        </div>
                        <div class="flex flex-wrap gap-2" aria-label="Roles asignados">
                            <Badge
                                v-for="role in authRoles"
                                :key="role"
                                variant="secondary"
                                class="gap-1.5 bg-emerald-600/10 text-emerald-800 hover:bg-emerald-600/10 dark:text-emerald-300"
                            >
                                <BriefcaseBusiness class="size-3" />
                                {{ role }}
                            </Badge>
                            <Badge v-if="!authRoles.length" variant="outline">
                                Sin rol asignado
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <Separator />

                <CardContent class="grid gap-6 py-6 sm:grid-cols-2">
                    <div
                        v-for="detail in accountDetails"
                        :key="detail.label"
                        class="flex min-w-0 gap-3"
                    >
                        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <component :is="detail.icon" class="size-4" />
                        </span>
                        <div class="min-w-0">
                            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {{ detail.label }}
                            </p>
                            <p class="mt-1 truncate text-sm font-medium" :title="detail.value">
                                {{ detail.value }}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    </GestionDashboard01Layout>
</template>
