<script setup lang="ts">
import { ref, watch } from 'vue'
import { Save, Settings2 } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'

const props = defineProps<{
    porcentaje: number
    diasLaborales: number
}>()

const emit = defineEmits<{
    save: [config: { porcentaje: number; diasLaborales: number }]
}>()

const open = ref(false)
const porcentajeDraft = ref(String(props.porcentaje))
const diasLaboralesDraft = ref(String(props.diasLaborales))
const error = ref<string | null>(null)

watch(open, (isOpen) => {
    if (!isOpen) return

    porcentajeDraft.value = String(props.porcentaje)
    diasLaboralesDraft.value = String(props.diasLaborales)
    error.value = null
})

function saveConfig() {
    const porcentaje = Number(porcentajeDraft.value)
    const diasLaborales = Number(diasLaboralesDraft.value)

    if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
        error.value = 'El porcentaje debe ser mayor que 0 y menor o igual que 100.'
        return
    }

    if (!Number.isFinite(diasLaborales) || diasLaborales <= 0 || diasLaborales > 7) {
        error.value = 'Los días laborables deben ser mayores que 0 y menores o iguales que 7.'
        return
    }

    emit('save', { porcentaje, diasLaborales })
    open.value = false
}
</script>

<template>
    <Sheet v-model:open="open">
        <SheetTrigger as-child>
            <Button variant="outline" size="sm">
                <Settings2 class="mr-2 h-4 w-4" />
                Configuración CMV
            </Button>
        </SheetTrigger>

        <SheetContent class="flex h-full w-full flex-col sm:max-w-md">
            <SheetHeader>
                <SheetTitle>Configuración de CMV</SheetTitle>
                <SheetDescription>
                    Estos valores se aplican al cálculo de CMV por día en todo el tablero.
                </SheetDescription>
            </SheetHeader>

            <div class="flex-1 space-y-6 px-4 py-6">
                <div class="space-y-2">
                    <Label for="porcentaje-cmv">Porcentaje de ventas netas</Label>
                    <div class="relative">
                        <Input
                            id="porcentaje-cmv"
                            v-model="porcentajeDraft"
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            class="pr-8"
                        />
                        <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                            %
                        </span>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        Valor inicial según la planilla: 75,15%.
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="dias-laborales-cmv">Días laborables</Label>
                    <Input
                        id="dias-laborales-cmv"
                        v-model="diasLaboralesDraft"
                        type="number"
                        min="0.5"
                        max="7"
                        step="0.5"
                    />
                    <p class="text-xs text-muted-foreground">
                        Divisor inicial según la fórmula de la planilla: 5,5 días.
                    </p>
                </div>

                <div class="rounded-lg border bg-muted/40 p-4">
                    <p class="text-xs font-medium text-muted-foreground">Fórmula aplicada</p>
                    <p class="mt-1 text-sm font-medium">
                        (Ventas netas × porcentaje) / días laborables
                    </p>
                </div>

                <p
                    v-if="error"
                    class="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {{ error }}
                </p>
            </div>

            <SheetFooter>
                <Button class="w-full" @click="saveConfig">
                    <Save class="mr-2 h-4 w-4" />
                    Guardar configuración
                </Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
