type Recaptcha = {
  ready: (callback: () => void) => void
  execute: (siteKey: string, options: { action: string }) => Promise<string>
  render?: (container: HTMLElement, options: {
    sitekey: string
    size: 'normal' | 'compact'
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
  }) => number
}

export type ChatbotAction = 'chatbot_message' | 'chatbot_transcription'
const timeoutMs = 8_000
const unavailable = 'Không thể xác minh reCAPTCHA. Vui lòng thử lại.'
let loading: Promise<Recaptcha> | undefined
let loadingChallenge: Promise<Recaptcha> | undefined

function loadRecaptchaScript(render: string): Promise<Recaptcha> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error(unavailable))
    }
    const timeout = window.setTimeout(fail, timeoutMs)
    script.async = true
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(render)}`
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
  })
}

function loadRecaptcha(siteKey: string): Promise<Recaptcha> {
  return loading ??= loadRecaptchaScript(siteKey).catch(error => {
    loading = undefined
    throw error
  })
}

function loadChallenge(): Promise<Recaptcha> {
  const existing = (window as Window & { grecaptcha?: Recaptcha }).grecaptcha
  if (existing?.render) return new Promise(resolve => existing.ready(() => resolve(existing)))
  return loadingChallenge ??= loadRecaptchaScript('explicit').catch(error => {
    loadingChallenge = undefined
    throw error
  })
}

export async function requestChatbotCaptcha(siteKey: string, signal?: AbortSignal): Promise<string> {
  signal?.throwIfAborted()
  if (document.querySelector('.chatbot-captcha-overlay'))
    throw new Error('Hãy hoàn tất xác minh đang mở rồi thử lại.')
  // Google's image challenge is appended to the body, outside the checkbox container.
  const overlay = document.createElement('div')
  overlay.className = 'chatbot-captcha-overlay'
  overlay.addEventListener('pointerdown', event => event.stopPropagation())
  const dialog = document.createElement('dialog')
  dialog.className = 'confirm-dialog'
  dialog.setAttribute('data-glass-exclude', '')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-label', 'Xác minh yêu cầu chatbot')
  dialog.setAttribute('aria-modal', 'true')
  const title = document.createElement('h2')
  title.textContent = 'Xác minh yêu cầu'
  const message = document.createElement('p')
  message.textContent = 'Bạn vừa gửi nhiều yêu cầu liên tiếp. Hãy xác minh để tiếp tục.'
  const widget = document.createElement('div')
  widget.className = 'chatbot-captcha-widget'
  const actions = document.createElement('div')
  actions.className = 'confirm-dialog__actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'btn btn-secondary'
  cancel.textContent = 'Hủy'
  actions.append(cancel)
  dialog.append(title, message, widget, actions)
  overlay.append(dialog)
  const app = document.getElementById('root')
  const wasInert = app?.inert ?? false
  const previousFocus = document.activeElement

  return new Promise<string>((resolve, reject) => {
    let finished = false
    const finish = (error?: unknown, token?: string) => {
      if (finished) return
      finished = true
      signal?.removeEventListener('abort', abort)
      dialog.close()
      overlay.remove()
      if (app) app.inert = wasInert
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
      if (token) resolve(token)
      else reject(error)
    }
    const abort = () => finish(signal?.reason)
    const dismiss = () => finish(new Error('Đã hủy xác minh yêu cầu.'))
    const fail = () => finish(new Error(unavailable))
    signal?.addEventListener('abort', abort, { once: true })
    cancel.addEventListener('click', dismiss)
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismiss()
      }
    })
    document.body.append(overlay)
    try {
      dialog.show()
      if (app) app.inert = true
      cancel.focus()
    } catch (error) {
      finish(error)
      return
    }
    void loadChallenge().then(api => {
      if (finished) return
      if (!api.render) return fail()
      api.render(widget, {
        sitekey: siteKey,
        size: window.matchMedia('(max-width: 400px)').matches ? 'compact' : 'normal',
        callback: token => token ? finish(undefined, token) : fail(),
        'expired-callback': () => finish(new Error('Xác minh đã hết hạn. Vui lòng gửi lại yêu cầu.')),
        'error-callback': fail,
      })
    }).catch(fail)
  })
}

async function requestToken(siteKey: string, action: ChatbotAction, signal: AbortSignal) {
  let onAbort: () => void = () => {}
  try {
    return await Promise.race([
      loadRecaptcha(siteKey).then(api => {
        signal.throwIfAborted()
        return api.execute(siteKey, { action })
      }),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(signal.reason)
        signal.addEventListener('abort', onAbort, { once: true })
      }),
    ])
  } finally {
    signal.removeEventListener('abort', onAbort)
  }
}

export async function chatbotRecaptchaHeaders(siteKey: string, action: ChatbotAction, signal?: AbortSignal) {
  // Retry token creation only. The caller still sends the API request once.
  for (const attemptTimeout of [timeoutMs * 2, timeoutMs]) {
    signal?.throwIfAborted()
    const timeout = AbortSignal.timeout(attemptTimeout)
    const attempt = signal ? AbortSignal.any([signal, timeout]) : timeout
    try {
      const token = await requestToken(siteKey, action, attempt)
      signal?.throwIfAborted()
      if (token) return { 'X-Homeji-Recaptcha': token }
    } catch {
      signal?.throwIfAborted()
    }
  }
  throw new Error(unavailable)
}
