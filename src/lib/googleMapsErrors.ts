export type MapsErrorCode =
  | 'BillingNotEnabled'
  | 'ApiNotActivated'
  | 'InvalidKey'
  | 'RefererNotAllowed'
  | 'ApiTargetBlocked'
  | 'PermissionDenied'
  | 'Unknown'

export type MapsErrorDiagnosis = {
  code: MapsErrorCode
  codes: MapsErrorCode[]
  title: string
  googleMessage: string
  steps: string[]
  consoleLinks: { label: string; url: string }[]
}

const CONSOLE = {
  billing: 'https://console.cloud.google.com/billing/linkedaccount',
  credentials: 'https://console.cloud.google.com/apis/credentials',
  mapsJs: 'https://console.cloud.google.com/apis/library/maps-backend.googleapis.com',
  places: 'https://console.cloud.google.com/apis/library/places-backend.googleapis.com',
  geocoding: 'https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com',
  mapsOverview: 'https://console.cloud.google.com/google/maps-apis/overview',
}

const DETECTORS: { code: MapsErrorCode; test: RegExp }[] = [
  { code: 'BillingNotEnabled', test: /BillingNotEnabled|must enable billing/i },
  { code: 'ApiNotActivated', test: /ApiNotActivated|has not been used|has not been activated/i },
  { code: 'InvalidKey', test: /InvalidKeyMapError|API key not valid|InvalidKey/i },
  { code: 'RefererNotAllowed', test: /RefererNotAllowed/i },
  { code: 'ApiTargetBlocked', test: /ApiTargetBlocked/i },
  { code: 'PermissionDenied', test: /Permission Denied|REQUEST_DENIED|gm_authFailure/i },
]

function detectCodes(text: string): MapsErrorCode[] {
  const found = DETECTORS.filter((d) => d.test.test(text)).map((d) => d.code)
  // PermissionDenied is generic — drop if we already have a specific code
  const specific = found.filter((c) => c !== 'PermissionDenied')
  if (specific.length > 0) return [...new Set(specific)]
  return found.length > 0 ? [...new Set(found)] : ['Unknown']
}

function buildDiagnosis(codes: MapsErrorCode[], googleMessage: string): MapsErrorDiagnosis {
  const baseLinks = [
    { label: 'Credentials (API keys)', url: CONSOLE.credentials },
    { label: 'Maps Platform overview', url: CONSOLE.mapsOverview },
  ]

  const steps: string[] = []
  const links: { label: string; url: string }[] = []
  const titles: string[] = []

  const add = (partial: Omit<MapsErrorDiagnosis, 'code' | 'codes' | 'googleMessage'>) => {
    titles.push(partial.title)
    for (const s of partial.steps) {
      if (!steps.includes(s)) steps.push(s)
    }
    for (const l of partial.consoleLinks) {
      if (!links.some((x) => x.url === l.url)) links.push(l)
    }
  }

  for (const code of codes) {
    switch (code) {
      case 'BillingNotEnabled':
        add({
          title: '① Billing chưa Active trên đúng project của key',
          steps: [
            'Mở đúng Google Cloud project đã tạo key (xem project trên trang Credentials của key).',
            'Billing → Linked billing account phải Active (không Closed / past due / chưa link).',
            'Chỉ bật API mà chưa gắn Billing → Google vẫn trả lỗi này.',
            'Sau khi gắn Billing, đợi 5–15 phút; Geocode phải ra status OK.',
          ],
          consoleLinks: [{ label: 'Bật / link Billing', url: CONSOLE.billing }, ...baseLinks],
        })
        break
      case 'ApiTargetBlocked':
        add({
          title: '② API restrictions của KEY đang chặn Maps JavaScript API',
          steps: [
            'Credentials → bấm vào đúng API key → mục API restrictions.',
            'Nếu đang “Restrict key”: phải tick Maps JavaScript API (+ Places, Geocoding nếu dùng).',
            'Test nhanh: chọn Don’t restrict key → Save → đợi 1–5 phút → F5.',
            'Lưu ý: bật API trong Library ≠ cho phép trên key. Restrict key mà quên tick = ApiTargetBlocked.',
          ],
          consoleLinks: baseLinks,
        })
        break
      case 'ApiNotActivated':
        add({
          title: 'Chưa bật Maps API trên project',
          steps: [
            'Bật Maps JavaScript API trên đúng project của key.',
            'Places API / Geocoding API nếu dùng autocomplete hoặc geocode.',
          ],
          consoleLinks: [
            { label: 'Maps JavaScript API', url: CONSOLE.mapsJs },
            { label: 'Places API', url: CONSOLE.places },
            { label: 'Geocoding API', url: CONSOLE.geocoding },
            ...baseLinks,
          ],
        })
        break
      case 'InvalidKey':
        add({
          title: 'API key không hợp lệ',
          steps: [
            'Copy lại key đủ ký tự, không thừa khoảng trắng.',
            'Tạo key mới nếu key đã xóa / regenerate.',
          ],
          consoleLinks: baseLinks,
        })
        break
      case 'RefererNotAllowed':
        add({
          title: 'HTTP referrer chặn domain hiện tại',
          steps: [
            'Application restrictions → thêm http://localhost:5173/* và https://exe101-homeji.onrender.com/*',
            'Hoặc Don’t restrict key để test.',
          ],
          consoleLinks: baseLinks,
        })
        break
      case 'PermissionDenied':
        add({
          title: 'Google từ chối key (Permission Denied)',
          steps: [
            'Kiểm tra Billing + API restrictions + đúng project của key.',
          ],
          consoleLinks: [
            { label: 'Billing', url: CONSOLE.billing },
            { label: 'Maps JavaScript API', url: CONSOLE.mapsJs },
            ...baseLinks,
          ],
        })
        break
      default:
        add({
          title: 'Không tải được Google Maps',
          steps: [
            'Gửi nguyên message Google cho người tạo key.',
            'Kiểm tra Billing, Maps JavaScript API, Key restrictions.',
          ],
          consoleLinks: baseLinks,
        })
    }
  }

  return {
    code: codes[0] ?? 'Unknown',
    codes,
    title: titles.join(' · '),
    googleMessage,
    steps,
    consoleLinks: links.length > 0 ? links : baseLinks,
  }
}

export function diagnoseMapsError(raw: string): MapsErrorDiagnosis {
  const googleMessage = raw.trim() || 'Không có message từ Google.'
  return buildDiagnosis(detectCodes(googleMessage), googleMessage)
}

export function maskApiKey(key: string): string {
  const k = key.trim()
  if (k.length < 12) return '(key quá ngắn)'
  return `${k.slice(0, 8)}…${k.slice(-4)}`
}

/** Gọi Geocoding để lấy error_message thật từ Google (rõ hơn UI Maps). */
export async function probeMapsApiKey(apiKey: string): Promise<{
  status: string
  errorMessage: string | null
  probeUrl: string
}> {
  const probeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Hanoi&key=${encodeURIComponent(apiKey)}`
  try {
    const res = await fetch(probeUrl)
    const data = (await res.json()) as {
      status?: string
      error_message?: string
    }
    return {
      status: data.status ?? `HTTP_${res.status}`,
      errorMessage: data.error_message ?? null,
      probeUrl: probeUrl.replace(apiKey, maskApiKey(apiKey)),
    }
  } catch (err) {
    return {
      status: 'FETCH_FAILED',
      errorMessage: err instanceof Error ? err.message : String(err),
      probeUrl: probeUrl.replace(apiKey, maskApiKey(apiKey)),
    }
  }
}

export function buildShareableMapsErrorReport(input: {
  diagnosis: MapsErrorDiagnosis
  apiKeyMasked: string
  origin: string
  probeStatus?: string
  probeError?: string | null
}): string {
  const { diagnosis, apiKeyMasked, origin, probeStatus, probeError } = input
  const lines = [
    '=== Homeji Google Maps — báo lỗi cho người tạo API key ===',
    `Thời gian: ${new Date().toISOString()}`,
    `Origin (trang web): ${origin}`,
    `API key (đã che): ${apiKeyMasked}`,
    `Mã lỗi: ${diagnosis.codes.join(', ')}`,
    `Tiêu đề: ${diagnosis.title}`,
    `Message Google: ${diagnosis.googleMessage}`,
  ]
  if (probeStatus) lines.push(`Geocode probe status: ${probeStatus}`)
  if (probeError) lines.push(`Geocode probe error_message: ${probeError}`)
  lines.push('', 'Việc cần làm:')
  diagnosis.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
  lines.push('', 'Link Console:')
  diagnosis.consoleLinks.forEach((l) => lines.push(`- ${l.label}: ${l.url}`))
  return lines.join('\n')
}
