<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Maximize, Minimize } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'

const isFullscreen = ref(false)
const isSupported = ref(true)

function syncFullscreenState() {
    isFullscreen.value = Boolean(document.fullscreenElement)
}

async function toggleFullscreen() {
    if (!isSupported.value) return

    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen()
        } else {
            await document.documentElement.requestFullscreen()
        }
    } catch {
        // El navegador puede rechazar la solicitud por sus políticas de permisos.
    }
}

onMounted(() => {
    isSupported.value = Boolean(document.fullscreenEnabled)
    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<template>
    <Button
        variant="ghost"
        size="icon"
        :disabled="!isSupported"
        :aria-label="isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'"
        :title="isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'"
        @click="toggleFullscreen"
    >
        <Minimize v-if="isFullscreen" class="size-4" />
        <Maximize v-else class="size-4" />
    </Button>
</template>
