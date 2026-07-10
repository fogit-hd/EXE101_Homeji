/**
 * Production host for Render Web Service:
 * - Serves Vite `dist` with SPA fallback
 * - Proxies `/api/*` → Fly API (avoids browser CORS)
 */
import http from 'node:http'
import https from 'node:https'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = Number(process.env.PORT || 3000)
const API_TARGET = (process.env.API_PROXY_TARGET || 'https://homeji-api.fly.dev').replace(
  /\/$/,
  '',
)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json',
}

function sendFile(res, filePath) {
  const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=0' })
  createReadStream(filePath).pipe(res)
}

function safeDistPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0])
  const rel = normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const full = join(DIST, rel)
  if (!full.startsWith(DIST)) return null
  return full
}

function proxyApi(req, res) {
  const targetUrl = new URL(req.url, API_TARGET)
  const lib = targetUrl.protocol === 'https:' ? https : http
  const headers = { ...req.headers, host: targetUrl.host }
  delete headers['accept-encoding']

  const upstream = lib.request(
    targetUrl,
    { method: req.method, headers },
    (up) => {
      res.writeHead(up.statusCode || 502, up.headers)
      up.pipe(res)
    },
  )

  upstream.on('error', (err) => {
    console.error('[api-proxy]', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' })
    }
    res.end(JSON.stringify({ title: 'Bad Gateway', detail: 'API proxy failed' }))
  })

  req.pipe(upstream)
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  let filePath = safeDistPath(urlPath)

  if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }

  if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(res, filePath)
    return
  }

  // SPA fallback
  const index = join(DIST, 'index.html')
  if (existsSync(index)) {
    sendFile(res, index)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api')) {
    proxyApi(req, res)
    return
  }
  serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Homeji web listening on ${PORT}, API → ${API_TARGET}`)
})
