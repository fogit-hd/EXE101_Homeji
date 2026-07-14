/** Structured location payloads embedded in chat message bodies (text-only API). */

export type ChatLocationKind = 'gps' | 'address' | 'place' | 'area'

export type ChatLocationPayload = {
  kind: ChatLocationKind
  title: string
  address?: string
  lat?: number
  lng?: number
}

const MARKER = '[homeji:location]'

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function encodeChatLocation(payload: ChatLocationPayload): string {
  const lines = [MARKER, `type=${payload.kind}`, `title=${payload.title}`]
  if (payload.address?.trim()) lines.push(`address=${payload.address.trim()}`)
  if (payload.lat != null && payload.lng != null) {
    lines.push(`lat=${payload.lat}`)
    lines.push(`lng=${payload.lng}`)
    lines.push(`url=${mapsUrl(payload.lat, payload.lng)}`)
  }
  return lines.join('\n')
}

export function parseChatLocation(body: string): ChatLocationPayload | null {
  const trimmed = body.trim()
  if (!trimmed.startsWith(MARKER)) return null
  const lines = trimmed.split('\n').slice(1)
  const data: Record<string, string> = {}
  for (const line of lines) {
    const i = line.indexOf('=')
    if (i <= 0) continue
    data[line.slice(0, i)] = line.slice(i + 1)
  }
  const kind = data.type as ChatLocationKind | undefined
  if (!kind || !['gps', 'address', 'place', 'area'].includes(kind)) return null
  if (!data.title?.trim()) return null
  const lat = data.lat != null ? Number(data.lat) : undefined
  const lng = data.lng != null ? Number(data.lng) : undefined
  return {
    kind,
    title: data.title.trim(),
    address: data.address?.trim() || undefined,
    lat: lat != null && Number.isFinite(lat) ? lat : undefined,
    lng: lng != null && Number.isFinite(lng) ? lng : undefined,
  }
}

export function chatLocationKindLabel(kind: ChatLocationKind): string {
  switch (kind) {
    case 'gps':
      return 'Vị trí'
    case 'address':
      return 'Địa chỉ'
    case 'place':
      return 'Địa điểm'
    case 'area':
      return 'Khu vực'
    default:
      return 'Vị trí'
  }
}
