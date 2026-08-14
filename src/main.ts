import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura';
import 'primeicons/primeicons.css'
import 'vue-sonner/style.css'
import './style.css'
import App from './App.vue'
import router from './router'
import './assets/index.css'
import { initializeTheme } from './composables/useTheme'

const app = createApp(App)

initializeTheme()

app.use(PrimeVue, {
    theme: {
        preset: Aura,
    },
})

app.use(router)

app.mount('#app')
