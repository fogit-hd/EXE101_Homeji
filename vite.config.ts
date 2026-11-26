import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

/*
 * Dev only. The deployed API issues cookie sessions (login, session adopt) only to the site's own origin
 * and answers 403 to any other, localhost included. The proxy therefore speaks for the site: it sends that
 * origin upstream and drops any Domain from the cookies coming back, so they land on localhost.
 * Set HOMEJI_API_ORIGIN when HOMEJI_API_URL points at an API that expects another origin.
 */
const apiOrigin = process.env.HOMEJI_API_ORIGIN || 'https://homeji.onrender.com'
const apiProxy: ProxyOptions = {
  target: process.env.HOMEJI_API_URL || 'https://homeji-be.onrender.com',
  changeOrigin: true,
  cookieDomainRewrite: '',
  configure: proxy => {
    proxy.on('proxyReq', request => request.setHeader('origin', apiOrigin))
    proxy.on('proxyReqWs', request => request.setHeader('origin', apiOrigin))
  },
}

// https://vite.dev/config/
export default defineConfig({
  // Tailwind is scoped to the guest landing (src/features/landing-hx/tailwind.css): prefix tw:, no preflight.
  plugins: [react(), tailwindcss()],
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
      '/api': { ...apiProxy },
      '/hubs': { ...apiProxy, ws: true },
    },
  },
})
