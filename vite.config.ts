import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
