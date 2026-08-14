<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
    CheckCircle2,
    LoaderCircle,
    Mail,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    UserCheck,
    UserRoundX,
    UsersRound,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import GestionDashboard01Layout from '@/components/gestion/GestionDashboard01Layout.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import {
    Table,
    TableBody,
    TableCell,
    TableEmpty,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    actualizarRolesUsuario,
    cambiarEstadoUsuario,
    crearUsuario,
    listarRoles,
    listarUsuarios,
    type GestionRole,
    type GestionUsuarioAdmin,
} from '@/services/usuarios.api'

const users = ref<GestionUsuarioAdmin[]>([])
const roles = ref<GestionRole[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const searchQuery = ref('')
const statusFilter = ref('todos')
const changingStatusId = ref<string | null>(null)
const editingUser = ref<GestionUsuarioAdmin | null>(null)
const selectedRoleCodes = ref<string[]>([])
const isRoleSheetOpen = ref(false)
const isSavingRoles = ref(false)
const isCreateSheetOpen = ref(false)
const newUsername = ref('')
const newUserActive = ref(true)
const newUserRoleCodes = ref<string[]>([])
const createError = ref<string | null>(null)
const isCreatingUser = ref(false)

const normalizedSearch = computed(() => searchQuery.value.trim().toLocaleLowerCase('es'))

const filteredUsers = computed(() => users.value.filter((user) => {
    const matchesStatus = statusFilter.value === 'todos'
        || (statusFilter.value === 'activos' && user.activo)
        || (statusFilter.value === 'inactivos' && !user.activo)

    if (!matchesStatus) return false
    if (!normalizedSearch.value) return true

    return [user.nombre, user.username, user.email, ...user.roles.map((role) => role.nombre)]
        .some((value) => value?.toLocaleLowerCase('es').includes(normalizedSearch.value))
}))

const activeUsers = computed(() => users.value.filter((user) => user.activo).length)
const inactiveUsers = computed(() => users.value.length - activeUsers.value)
const adminUsers = computed(() => users.value.filter((user) =>
    user.roles.some((role) => role.codigo === 'ADMIN_GESTION')
).length)

async function loadAdministration() {
    isLoading.value = true
    loadError.value = null

    try {
        const [userList, roleList] = await Promise.all([listarUsuarios(), listarRoles()])
        users.value = userList
        roles.value = roleList
    } catch (error) {
        loadError.value = error instanceof Error
            ? error.message
            : 'No se pudo cargar la administración de usuarios.'
    } finally {
        isLoading.value = false
    }
}

function initials(user: GestionUsuarioAdmin): string {
    const parts = user.nombre.trim().split(/\s+/).filter(Boolean)
    return (parts.length > 1 ? `${parts[0]?.[0]}${parts.at(-1)?.[0]}` : parts[0]?.slice(0, 2))
        ?.toLocaleUpperCase('es') || 'US'
}

function formatLastAccess(value?: string): string {
    if (!value) return 'Sin registro'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function openRoleEditor(user: GestionUsuarioAdmin) {
    editingUser.value = user
    selectedRoleCodes.value = user.roles.map((role) => role.codigo)
    isRoleSheetOpen.value = true
}

function toggleRole(code: string) {
    selectedRoleCodes.value = selectedRoleCodes.value.includes(code)
        ? selectedRoleCodes.value.filter((roleCode) => roleCode !== code)
        : [...selectedRoleCodes.value, code]
}

function openCreateUser() {
    newUsername.value = ''
    newUserActive.value = true
    newUserRoleCodes.value = []
    createError.value = null
    isCreateSheetOpen.value = true
}

function toggleNewUserRole(code: string) {
    createError.value = null
    newUserRoleCodes.value = newUserRoleCodes.value.includes(code)
        ? newUserRoleCodes.value.filter((roleCode) => roleCode !== code)
        : [...newUserRoleCodes.value, code]
}

async function addUser() {
    const username = newUsername.value.trim()
    if (!username) {
        createError.value = 'Ingresá el usuario de Windows.'
        return
    }

    if (!newUserRoleCodes.value.length) {
        createError.value = 'Seleccioná al menos un rol para habilitar el acceso.'
        return
    }

    isCreatingUser.value = true
    createError.value = null

    try {
        const createdUser = await crearUsuario({
            username,
            activo: newUserActive.value,
            roles: newUserRoleCodes.value,
        })

        if (createdUser) {
            users.value = [...users.value, createdUser]
        } else {
            await loadAdministration()
        }

        toast.success(`${createdUser?.nombre ?? username} fue agregado.`)
        isCreateSheetOpen.value = false
    } catch (error) {
        createError.value = error instanceof Error ? error.message : 'No se pudo agregar el usuario.'
    } finally {
        isCreatingUser.value = false
    }
}

async function saveRoles() {
    if (!editingUser.value) return
    isSavingRoles.value = true

    try {
        await actualizarRolesUsuario(editingUser.value.id, selectedRoleCodes.value)
        const nextRoles = roles.value.filter((role) => selectedRoleCodes.value.includes(role.codigo))
        users.value = users.value.map((user) => user.id === editingUser.value?.id
            ? { ...user, roles: nextRoles }
            : user
        )
        toast.success(`Roles de ${editingUser.value.nombre} actualizados.`)
        isRoleSheetOpen.value = false
    } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudieron guardar los roles.')
    } finally {
        isSavingRoles.value = false
    }
}

async function toggleUserStatus(user: GestionUsuarioAdmin) {
    changingStatusId.value = user.id
    const nextStatus = !user.activo

    try {
        await cambiarEstadoUsuario(user.id, nextStatus)
        users.value = users.value.map((item) => item.id === user.id
            ? { ...item, activo: nextStatus }
            : item
        )
        toast.success(`${user.nombre} fue ${nextStatus ? 'activado' : 'desactivado'}.`)
    } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado.')
    } finally {
        changingStatusId.value = null
    }
}

onMounted(loadAdministration)
</script>

<template>
    <GestionDashboard01Layout page-title="Administración de usuarios">
        <section class="mx-auto w-full max-w-7xl space-y-6" aria-labelledby="users-title">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Administración
                    </p>
                    <h1 id="users-title" class="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                        Administración de usuarios
                    </h1>
                    <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                        Gestioná el acceso al tablero, el estado de las cuentas y los roles asignados.
                    </p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="isLoading" @click="loadAdministration">
                        <RefreshCw class="mr-2 size-4" :class="isLoading ? 'animate-spin' : ''" />
                        Actualizar
                    </Button>
                    <Button @click="openCreateUser">
                        <Plus class="mr-2 size-4" />
                        Agregar usuario
                    </Button>
                </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                    <CardContent class="flex items-center gap-4 py-5">
                        <span class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <UsersRound class="size-5" />
                        </span>
                        <div>
                            <p class="text-2xl font-semibold tabular-nums">{{ users.length }}</p>
                            <p class="text-xs text-muted-foreground">Usuarios totales</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-4 py-5">
                        <span class="flex size-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">
                            <UserCheck class="size-5" />
                        </span>
                        <div>
                            <p class="text-2xl font-semibold tabular-nums">{{ activeUsers }}</p>
                            <p class="text-xs text-muted-foreground">Accesos activos</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-4 py-5">
                        <span class="flex size-10 items-center justify-center rounded-lg bg-rose-600/10 text-rose-700 dark:text-rose-400">
                            <UserRoundX class="size-5" />
                        </span>
                        <div>
                            <p class="text-2xl font-semibold tabular-nums">{{ inactiveUsers }}</p>
                            <p class="text-xs text-muted-foreground">Accesos inactivos</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-4 py-5">
                        <span class="flex size-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-400">
                            <ShieldCheck class="size-5" />
                        </span>
                        <div>
                            <p class="text-2xl font-semibold tabular-nums">{{ adminUsers }}</p>
                            <p class="text-xs text-muted-foreground">Administradores</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader class="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Usuarios</CardTitle>
                        <CardDescription class="mt-1.5">
                            {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados' }}
                        </CardDescription>
                    </div>
                    <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <div class="relative sm:w-72">
                            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                v-model="searchQuery"
                                class="pl-9"
                                placeholder="Buscar usuario, correo o rol..."
                                aria-label="Buscar usuarios"
                            />
                        </div>
                        <Select v-model="statusFilter">
                            <SelectTrigger class="w-full sm:w-40" aria-label="Filtrar por estado">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="activos">Activos</SelectItem>
                                <SelectItem value="inactivos">Inactivos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent class="p-0">
                    <div v-if="loadError" class="flex flex-col items-center px-6 py-14 text-center">
                        <span class="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <UserRoundX class="size-5" />
                        </span>
                        <p class="font-medium">No pudimos cargar los usuarios</p>
                        <p class="mt-1 max-w-md text-sm text-muted-foreground">{{ loadError }}</p>
                        <Button class="mt-5" variant="outline" @click="loadAdministration">
                            <RefreshCw class="mr-2 size-4" />
                            Reintentar
                        </Button>
                    </div>

                    <Table v-else>
                        <TableHeader>
                            <TableRow>
                                <TableHead class="min-w-64 pl-6">Usuario</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead class="whitespace-nowrap">Último acceso</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead class="pr-6 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <template v-if="isLoading">
                                <TableRow v-for="index in 5" :key="index">
                                    <TableCell v-for="cell in 5" :key="cell" :class="cell === 1 ? 'pl-6' : ''">
                                        <div class="h-5 animate-pulse rounded bg-muted" :class="cell === 1 ? 'w-44' : 'w-24'" />
                                    </TableCell>
                                </TableRow>
                            </template>
                            <TableEmpty v-else-if="!filteredUsers.length" :colspan="5">
                                <div class="text-center">
                                    <UsersRound class="mx-auto size-8 text-muted-foreground/60" />
                                    <p class="mt-3 font-medium">No hay usuarios para mostrar</p>
                                    <p class="mt-1 text-sm text-muted-foreground">
                                        Probá con otra búsqueda o cambiá el filtro de estado.
                                    </p>
                                </div>
                            </TableEmpty>
                            <TableRow v-for="user in filteredUsers" v-else :key="user.id">
                                <TableCell class="pl-6">
                                    <div class="flex items-center gap-3">
                                        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                            {{ initials(user) }}
                                        </span>
                                        <div class="min-w-0">
                                            <p class="truncate font-medium">{{ user.nombre }}</p>
                                            <p class="truncate text-xs text-muted-foreground">{{ user.username }}</p>
                                            <p v-if="user.email" class="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                <Mail class="size-3 shrink-0" />
                                                {{ user.email }}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div class="flex min-w-48 flex-wrap gap-1.5">
                                        <Badge v-for="role in user.roles" :key="role.codigo" variant="secondary">
                                            {{ role.nombre }}
                                        </Badge>
                                        <span v-if="!user.roles.length" class="text-xs text-muted-foreground">Sin roles</span>
                                    </div>
                                </TableCell>
                                <TableCell class="whitespace-nowrap text-muted-foreground">
                                    {{ formatLastAccess(user.ultimoAcceso) }}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        :class="user.activo
                                            ? 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300'
                                            : 'border-rose-600/30 bg-rose-600/10 text-rose-800 dark:text-rose-300'"
                                    >
                                        <span class="mr-1.5 size-1.5 rounded-full" :class="user.activo ? 'bg-emerald-600' : 'bg-rose-600'" />
                                        {{ user.activo ? 'Activo' : 'Inactivo' }}
                                    </Badge>
                                </TableCell>
                                <TableCell class="pr-6">
                                    <div class="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" @click="openRoleEditor(user)">
                                            <Pencil class="mr-2 size-3.5" />
                                            Roles
                                        </Button>
                                        <Button
                                            :variant="user.activo ? 'ghost' : 'outline'"
                                            size="sm"
                                            :disabled="changingStatusId === user.id"
                                            :class="user.activo ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : ''"
                                            @click="toggleUserStatus(user)"
                                        >
                                            <LoaderCircle v-if="changingStatusId === user.id" class="mr-2 size-3.5 animate-spin" />
                                            {{ user.activo ? 'Desactivar' : 'Activar' }}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>

        <Sheet v-model:open="isRoleSheetOpen">
            <SheetContent class="w-full gap-0 sm:max-w-lg">
                <SheetHeader class="border-b p-6 pr-12">
                    <SheetTitle>Editar roles</SheetTitle>
                    <SheetDescription>
                        Definí los permisos de {{ editingUser?.nombre }} dentro del tablero de Gestión Financiera.
                    </SheetDescription>
                </SheetHeader>

                <div class="flex-1 overflow-y-auto p-6">
                    <div v-if="editingUser" class="mb-6 flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
                        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            {{ initials(editingUser) }}
                        </span>
                        <div class="min-w-0">
                            <p class="truncate text-sm font-medium">{{ editingUser.nombre }}</p>
                            <p class="truncate text-xs text-muted-foreground">{{ editingUser.username }}</p>
                        </div>
                    </div>

                    <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Roles disponibles</p>
                    <div class="space-y-3">
                        <label
                            v-for="role in roles"
                            :key="role.codigo"
                            class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                            :class="selectedRoleCodes.includes(role.codigo) ? 'border-emerald-600 bg-emerald-600/5' : ''"
                        >
                            <input
                                type="checkbox"
                                class="mt-0.5 size-4 rounded border-input accent-emerald-700"
                                :checked="selectedRoleCodes.includes(role.codigo)"
                                @change="toggleRole(role.codigo)"
                            >
                            <span class="min-w-0 flex-1">
                                <span class="flex items-center justify-between gap-3">
                                    <span class="text-sm font-medium">{{ role.nombre }}</span>
                                    <CheckCircle2 v-if="selectedRoleCodes.includes(role.codigo)" class="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                                </span>
                                <span class="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                    {{ role.descripcion || role.codigo }}
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <SheetFooter class="border-t p-6 sm:flex-row sm:justify-end">
                    <Button variant="outline" :disabled="isSavingRoles" @click="isRoleSheetOpen = false">
                        Cancelar
                    </Button>
                    <Button :disabled="isSavingRoles" @click="saveRoles">
                        <LoaderCircle v-if="isSavingRoles" class="mr-2 size-4 animate-spin" />
                        Guardar roles
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>

        <Sheet v-model:open="isCreateSheetOpen">
            <SheetContent class="w-full gap-0 sm:max-w-lg">
                <SheetHeader class="border-b p-6 pr-12">
                    <SheetTitle>Agregar usuario</SheetTitle>
                    <SheetDescription>
                        Habilitá un usuario de Windows y definí con qué rol ingresará al tablero.
                    </SheetDescription>
                </SheetHeader>

                <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="addUser">
                    <div class="flex-1 space-y-6 overflow-y-auto p-6">
                        <div class="space-y-2">
                            <label for="new-user-username" class="text-sm font-medium">
                                Usuario de Windows
                            </label>
                            <Input
                                id="new-user-username"
                                v-model="newUsername"
                                name="username"
                                autocomplete="off"
                                placeholder="Ej.: jperez"
                                :disabled="isCreatingUser"
                                @input="createError = null"
                            />
                            <p class="text-xs leading-relaxed text-muted-foreground">
                                Ingresá el mismo nombre de usuario que utiliza para iniciar sesión en Windows.
                            </p>
                        </div>

                        <div>
                            <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Rol inicial
                            </p>
                            <div class="space-y-3">
                                <label
                                    v-for="role in roles"
                                    :key="role.codigo"
                                    class="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                                    :class="newUserRoleCodes.includes(role.codigo) ? 'border-emerald-600 bg-emerald-600/5' : ''"
                                >
                                    <input
                                        type="checkbox"
                                        class="mt-0.5 size-4 rounded border-input accent-emerald-700"
                                        :checked="newUserRoleCodes.includes(role.codigo)"
                                        :disabled="isCreatingUser"
                                        @change="toggleNewUserRole(role.codigo)"
                                    >
                                    <span class="min-w-0 flex-1">
                                        <span class="flex items-center justify-between gap-3">
                                            <span class="text-sm font-medium">{{ role.nombre }}</span>
                                            <CheckCircle2 v-if="newUserRoleCodes.includes(role.codigo)" class="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                                        </span>
                                        <span class="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                            {{ role.descripcion || role.codigo }}
                                        </span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <label class="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-4">
                            <span>
                                <span class="block text-sm font-medium">Acceso activo</span>
                                <span class="mt-1 block text-xs text-muted-foreground">
                                    El usuario podrá ingresar inmediatamente después del alta.
                                </span>
                            </span>
                            <input
                                v-model="newUserActive"
                                type="checkbox"
                                class="size-4 rounded border-input accent-emerald-700"
                                :disabled="isCreatingUser"
                            >
                        </label>

                        <p
                            v-if="createError"
                            role="alert"
                            class="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                        >
                            {{ createError }}
                        </p>
                    </div>

                    <SheetFooter class="border-t p-6 sm:flex-row sm:justify-end">
                        <Button type="button" variant="outline" :disabled="isCreatingUser" @click="isCreateSheetOpen = false">
                            Cancelar
                        </Button>
                        <Button type="submit" :disabled="isCreatingUser">
                            <LoaderCircle v-if="isCreatingUser" class="mr-2 size-4 animate-spin" />
                            Agregar usuario
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    </GestionDashboard01Layout>
</template>
