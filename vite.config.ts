import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  server: {
    host: true, // or '0.0.0.0' to listen on all addresses
  },
  plugins: [vue(), tailwindcss()],
  // El generador se importa al descargar: optimizarlo al iniciar evita una
  // actualización tardía de dependencias con el tablero ya abierto.
  optimizeDeps: {
    include: ['jspdf'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
