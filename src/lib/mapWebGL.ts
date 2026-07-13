/** Helpers for Google Maps Vector / WebGL readiness. */

/** Vector WebGL needs a non-zero container — never create Map at 0×0. */
export function waitForMapHostSize(
  el: HTMLElement,
  timeoutMs = 4000,
): Promise<{ width: number; height: number }> {
  const read = () => ({ width: el.clientWidth, height: el.clientHeight })
  const now = read()
  if (now.width > 0 && now.height > 0) return Promise.resolve(now)

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      ro.disconnect()
      window.clearTimeout(timer)
      resolve(read())
    }
    const ro = new ResizeObserver(() => {
      const s = read()
      if (s.width > 0 && s.height > 0) finish()
    })
    ro.observe(el)
    const timer = window.setTimeout(finish, timeoutMs)
  })
}

export type MapWebGLProbe = {
  webgl2: boolean
  webgl: boolean
  hardwareAccelLikely: boolean
  detail: string
}

export function probeMapWebGL(): MapWebGLProbe {
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2', {
      failIfMajorPerformanceCaveat: true,
    })
    if (gl2) {
      return {
        webgl2: true,
        webgl: true,
        hardwareAccelLikely: true,
        detail: 'WebGL2 hardware OK',
      }
    }

    const glSoft =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (glSoft) {
      return {
        webgl2: false,
        webgl: true,
        hardwareAccelLikely: false,
        detail: 'WebGL software path',
      }
    }

    return {
      webgl2: false,
      webgl: false,
      hardwareAccelLikely: false,
      detail: 'No WebGL context available',
    }
  } catch {
    return {
      webgl2: false,
      webgl: false,
      hardwareAccelLikely: false,
      detail: 'WebGL probe threw',
    }
  }
}
