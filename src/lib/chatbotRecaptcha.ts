type Recaptcha = {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

type ChatbotAction = 'chatbot_message' | 'chatbot_transcription'
const timeoutMs = 8_000
const unavailable = 'Không thể xác minh reCAPTCHA. Vui lòng thử lại.'
let loading: Promise<Recaptcha> | undefined

function loadRecaptcha(siteKey: string): Promise<Recaptcha> {
  loading ??= new Promise<Recaptcha>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error(unavailable))
    }
    const timeout = window.setTimeout(fail, timeoutMs)
    script.async = true
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.onerror = fail
    script.onload = () => {
      const api = (window as Window & { grecaptcha?: Recaptcha }).grecaptcha
      if (!api?.ready || !api.execute) return fail()
      api.ready(() => {
        window.clearTimeout(timeout)
        resolve(api)
      })
    }
    document.head.append(script)
  }).catch(error => {
    loading = undefined
    throw error
  })
  return loading
}

export async function chatbotRecaptchaHeaders(siteKey: string, action: ChatbotAction, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const controller = AbortSignal.any([AbortSignal.timeout(timeoutMs * 2), ...(signal ? [signal] : [])])
  let onAbort: () => void = () => {}
  try {
    const token = await Promise.race([
      loadRecaptcha(siteKey).then(api => {
        controller.throwIfAborted()
        return api.execute(siteKey, { action })
      }),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(controller.reason)
        controller.addEventListener('abort', onAbort, { once: true })
      }),
    ])
    if (!token) throw new Error(unavailable)
    return { 'X-Homeji-Recaptcha': token }
  } catch {
    signal?.throwIfAborted()
    throw new Error(unavailable)
  } finally {
    controller.removeEventListener('abort', onAbort)
  }
}
