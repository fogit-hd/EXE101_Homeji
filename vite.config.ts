import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: resolve('index.html'), publicRentalAnalytics: resolve('src/publicRentalAnalytics.ts') },
      output: { entryFileNames: chunk => chunk.name === 'publicRentalAnalytics' ? 'assets/public-rental-analytics.js' : 'assets/[name]-[hash].js' },
    },
    // Silence large-chunk warning on Render (default 500 kB)
    chunkSizeWarningLimit: 1500,
  },
  server: {
    watch: {
      // Source media assets can be locked by Windows/Explorer and crash Vite's FSWatcher
      ignored: ['**/video-src/**', '**/picture-src/**'],
    },
    proxy: {
      '/api': {
        target: process.env.HOMEJI_API_URL || 'https://homeji-be.onrender.com',
        changeOrigin: true,
      },
      '/hubs': {
        target: process.env.HOMEJI_API_URL || 'https://homeji-be.onrender.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
