import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const DEFAULT_SECTION = '#resumen'
const MAX_SCROLL_ATTEMPTS = 20
const SCROLL_RETRY_DELAY = 100

export function useGestionSectionNavigation() {
    const route = useRoute()
    const activeSection = ref(route.hash || DEFAULT_SECTION)

    let scrollRequest = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    function scrollToSection(section: string) {
        const request = ++scrollRequest

        if (retryTimer) clearTimeout(retryTimer)

        function tryScroll(attempt: number) {
            void nextTick(() => {
                if (request !== scrollRequest) return

                const target = document.getElementById(section.replace(/^#/, ''))

                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    return
                }

                if (attempt < MAX_SCROLL_ATTEMPTS) {
                    retryTimer = setTimeout(
                        () => tryScroll(attempt + 1),
                        SCROLL_RETRY_DELAY
                    )
                }
            })
        }

        tryScroll(0)
    }

    function navigateToSection(section: string) {
        activeSection.value = section
        scrollToSection(section)
    }

    watch(
        () => route.hash,
        (hash, previousHash) => {
            const section = hash || DEFAULT_SECTION
            activeSection.value = section

            if (hash || previousHash !== undefined) {
                scrollToSection(section)
            }
        },
        { immediate: true }
    )

    onBeforeUnmount(() => {
        scrollRequest += 1
        if (retryTimer) clearTimeout(retryTimer)
    })

    return {
        activeSection,
        navigateToSection,
    }
}
