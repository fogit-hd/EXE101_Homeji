const IMMUTABLE = 'public, max-age=31536000, immutable'
const REVALIDATE = 'no-cache'
// Vite's chunk names end in an 8-character content hash, so a changed file always gets a new URL.
const HASHED_ASSET = /^\/assets\/.+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/
// Linked by a fixed name from server-rendered rental pages; a new build reuses this URL.
const STABLE_ASSETS = new Set(['/assets/public-rental-analytics.js'])

export function cacheControlFor(urlPath) {
  return HASHED_ASSET.test(urlPath) && !STABLE_ASSETS.has(urlPath) ? IMMUTABLE : REVALIDATE
}

export function etagFor(stats) {
  return `"${stats.size.toString(16)}-${Math.trunc(stats.mtimeMs).toString(16)}"`
}

/** Cloudflare weakens ETags when it compresses, and the browser sends that form back. */
export function isNotModified(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false
  return ifNoneMatch.split(',').some(value => {
    const candidate = value.trim()
    return candidate === '*' || candidate.replace(/^W\//, '') === etag
  })
}
