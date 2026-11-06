import { isIP } from 'node:net'

export const CLIENT_IP_HEADER = 'x-homeji-client-ip'
export const PROXY_SECRET_HEADER = 'x-homeji-proxy-secret'

/**
 * Tells the API who the visitor is, so one visitor cannot use up every guest's rate limit.
 * Cloudflare overwrites CF-Connecting-IP at the edge; X-Forwarded-For's first entry is client-supplied.
 * Incoming copies are always removed, so a browser can never choose its own identity.
 */
export function applyClientIdentity(headers, remoteAddress, secret) {
  delete headers[CLIENT_IP_HEADER]
  delete headers[PROXY_SECRET_HEADER]
  if (!secret) return headers
  const edgeIp = headers['cf-connecting-ip']
  const clientIp = isIP(edgeIp ?? '') ? edgeIp : remoteAddress
  if (isIP(clientIp ?? '')) {
    headers[CLIENT_IP_HEADER] = clientIp
    headers[PROXY_SECRET_HEADER] = secret
  }
  return headers
}
