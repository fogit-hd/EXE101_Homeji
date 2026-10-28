import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { main: resolve('index.html'), publicRentalAnalytics: resolve('src/publicRentalAnalytics.ts') },
      output: {
        entryFileNames: chunk => chunk.name === 'publicRentalAnalytics' ? 'assets/public-rental-analytics.js' : 'assets/[name]-[hash].js',
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'vendor-react', test: /node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\// },
            { name: 'vendor-scroll', test: /node_modules\/lenis\// },
            { name: 'vendor-google', test: /node_modules\/@react-oauth\// },
            { name: 'vendor-gsap', test: /node_modules\/gsap\// },
            { name: 'vendor-query', test: /node_modules\/@tanstack\// },
            { name: 'vendor-signalr', test: /node_modules\/@microsoft\/signalr\// },
            { name: 'vendor-motion', test: /node_modules\/(motion|motion-dom|motion-utils|framer-motion)\// },
          ],
        },
      },
    },
    manifest: true,
    chunkSizeWarningLimit: 500,
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
