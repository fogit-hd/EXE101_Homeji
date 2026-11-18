const scripts = new Map<string, Promise<void>>()

export function loadPaymentScript(url: string) {
  const loaded = scripts.get(url)
  if (loaded) return loaded

  const script = document.createElement('script')
  const loading = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(fail, 12_000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('Không tải được SDK thanh toán.'))
    }
    script.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    script.onerror = fail
    script.src = url
    document.head.append(script)
  }).catch((error: unknown) => {
    scripts.delete(url)
    throw error
  })
  scripts.set(url, loading)
  return loading
}
