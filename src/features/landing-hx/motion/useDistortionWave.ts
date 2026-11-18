import { useCallback } from 'react'
import { flushSync } from 'react-dom'
import type { DistortionWaveOptions } from 'distortion-wave'

type DistortionWaveModule = typeof import('distortion-wave')

let modulePromise: Promise<DistortionWaveModule | null> | null = null
let cachedModule: DistortionWaveModule | null = null
let shadersWarmed = false

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function insideTransformedSurface(target: Element): boolean {
  return Boolean(target.closest('.hx-surface'))
}

export function loadDistortionWave(): Promise<DistortionWaveModule | null> {
  if (cachedModule) return Promise.resolve(cachedModule)
  if (!modulePromise) {
    modulePromise = import('distortion-wave')
      .then(mod => {
        cachedModule = mod
        return mod
      })
      .catch(() => null)
  }
  return modulePromise
}

export function warmupDistortionWave(): void {
  if (prefersReducedMotion() || shadersWarmed) return
  void loadDistortionWave().then(mod => {
    if (!mod || shadersWarmed) return
    shadersWarmed = mod.warmupWave()
  })
}

export type WaveCallOptions = {
  source?: Element | null
  focus?: MouseEvent | PointerEvent | KeyboardEvent | null
}

/**
 * Triggers a lightweight, GPU-friendly Distortion Wave transition on a target container.
 * Loads the WebGL2 module on demand, honors `prefers-reduced-motion`, and always runs `update`.
 */
export function useDistortionWave(defaults?: Partial<DistortionWaveOptions>) {
  const warmup = useCallback(() => {
    warmupDistortionWave()
  }, [])

  const wave = useCallback(
    async (target: Element | null, update: () => void, options?: WaveCallOptions) => {
      if (!target || !target.isConnected || prefersReducedMotion() || insideTransformedSurface(target)) {
        update()
        return
      }

      const mod = cachedModule ?? (await loadDistortionWave())
      if (!mod || !target.isConnected) {
        update()
        return
      }

      mod.distortionWave(
        target,
        () => {
          flushSync(update)
        },
        {
          duration: 680,
          intensity: 0.55,
          palette: 'mint',
          particles: false,
          ...defaults,
          source: options?.source ?? undefined,
          focus: options?.focus ?? null,
        },
      )
    },
    [defaults],
  )

  return { wave, warmup }
}
