import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Source media assets can be locked by Windows/Explorer and crash Vite's FSWatcher
      ignored: ['**/video-src/**', '**/picture-src/**'],
    },
    proxy: {
      '/api': {
        target: 'https://homeji-api.fly.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
