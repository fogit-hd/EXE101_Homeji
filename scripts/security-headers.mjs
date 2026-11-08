import { createHash } from 'node:crypto'

/** Reaches the API through the /api proxy; the API validates, sanitizes and logs each report. */
export const CSP_REPORT_PATH = '/api/csp-reports'

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

/** Hashes let the theme and intro bootstraps in index.html run without 'unsafe-inline'. */
export function inlineScriptHashes(html) {
  // HTML parsers normalize newlines before hashing, and Windows builds keep CRLF in dist/index.html.
  return [...html.replace(/\r\n?/g, '\n').matchAll(INLINE_SCRIPT)]
    .map(([, body]) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
}

export function contentSecurityPolicy(scriptHashes = []) {
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...scriptHashes, "'wasm-unsafe-eval'", 'https://accounts.google.com/gsi/client', 'https://maps.googleapis.com', 'https://www.googletagmanager.com', 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'],
    // React style props, Google Maps and Google Identity all rely on inline styles.
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    // Listing photos come from several source sites, so hosts cannot be enumerated.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'blob:', 'https://res.cloudinary.com'],
    // 'self' covers the same-origin SignalR WebSocket. WebRTC relays (Metered) are not governed by connect-src.
    'connect-src': ["'self'", 'https://maps.googleapis.com', 'https://places.googleapis.com', 'https://accounts.google.com/gsi/', 'https://api.giphy.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.google.com/g/collect', 'https://*.googletagmanager.com', 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'https://www.google.com/recaptcha/'],
    'worker-src': ["'self'", 'blob:'],
    'frame-src': ['https://accounts.google.com/gsi/', 'https://www.google.com/recaptcha/', 'https://recaptcha.google.com/recaptcha/'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    // Adding report-to makes Chromium ignore report-uri, and it delivered nothing to us when measured.
    'report-uri': [CSP_REPORT_PATH],
  }
  return Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`).join('; ')
}

export function securityHeaders(scriptHashes = []) {
  return {
    // Report-Only until real pages show no unexpected violations.
    'Content-Security-Policy-Report-Only': contentSecurityPolicy(scriptHashes),
    // Browsers ignore frame-ancestors in Report-Only policies, so framing is blocked here.
    'X-Frame-Options': 'DENY',
    // Browsers ignore this over plain HTTP, so local runs are unaffected.
    'Strict-Transport-Security': 'max-age=31536000',
  }
}
