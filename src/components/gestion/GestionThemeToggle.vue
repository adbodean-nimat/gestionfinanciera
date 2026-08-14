<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sun } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'

withDefaults(defineProps<{
    compact?: boolean
}>(), {
    compact: false,
})

const { theme, toggleTheme } = useTheme()

const isDark = computed(() => theme.value === 'dark')
const buttonLabel = computed(() =>
    isDark.value ? 'Modo claro' : 'Modo oscuro'
)
</script>

<template>
    <Button
        variant="ghost"
        :size="compact ? 'icon' : 'sm'"
        :aria-label="`Activar ${buttonLabel.toLowerCase()}`"
        :title="`Activar ${buttonLabel.toLowerCase()}`"
        @click="toggleTheme"
    >
        <Sun v-if="isDark" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
        <span v-if="!compact">{{ buttonLabel }}</span>
    </Button>
</template>
