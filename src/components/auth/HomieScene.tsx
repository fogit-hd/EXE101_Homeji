import { useEffect, useRef, useState } from 'react'
import type * as Three from 'three'
import { observeElementResize } from '../../lib/observeElementResize'

export type HomieState = 'idle' | 'typing' | 'password' | 'peek' | 'error' | 'success' | 'submitting'

export function HomieScene({ state, progress }: { state: HomieState; progress: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const interaction = useRef({ state, progress })
  const refresh = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  useEffect(() => { interaction.current = { state, progress }; refresh.current() }, [state, progress])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false, cleanup = () => {}
    void Promise.all([import('three'), import('./homieModel')]).then(([T, { createHomieModel }]) => {
      if (disposed) return
      let renderer: InstanceType<typeof T.WebGLRenderer>
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }) }
      catch { return }
      renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width: 900px)').matches ? 1.4 : 1.75))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = T.SRGBColorSpace
      renderer.toneMapping = T.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.22
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = T.PCFSoftShadowMap
      renderer.domElement.setAttribute('aria-hidden', 'true')
      host.appendChild(renderer.domElement)
      const scene = new T.Scene()
      const camera = new T.PerspectiveCamera(31, 1, .1, 50)
      camera.position.set(0, 1.65, 7.5); camera.lookAt(0, 1.5, 0)
      scene.add(new T.HemisphereLight('#fff8ea', '#b0a28d', 2.5))
      const key = new T.DirectionalLight('#fff4dc', 3.6)
      key.position.set(-3, 6, 5); key.castShadow = true
      key.shadow.mapSize.set(1024, 1024)
      key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 4; key.shadow.camera.bottom = -2
      key.shadow.normalBias = .025; key.shadow.radius = 4
      key.shadow.camera.near = .5; key.shadow.camera.far = 15; key.shadow.camera.updateProjectionMatrix()
      scene.add(key)
      const fill = new T.DirectionalLight('#ffffff', 1.7); fill.position.set(3, 2, 4); scene.add(fill)
      const model = createHomieModel(); scene.add(model.root)
      const floor = new T.Mesh(new T.PlaneGeometry(12, 12), new T.ShadowMaterial({ opacity: .075 }))
      floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
      const reduced = matchMedia('(prefers-reduced-motion: reduce)')
      const pointer = { x: 0, y: 0 }
      let visible = true, last = 0
      const render = (now: number, force = false) => {
        if (disposed || (!force && now - last < 1000 / 30)) return
        const dt = last ? Math.min((now - last) / 1000, .05) : .05
        last = now
        model.update(interaction.current.state, interaction.current.progress, pointer, now / 1000, dt, reduced.matches)
        renderer.render(scene, camera)
      }
      const draw = () => render(performance.now(), true)
      const visibility = () => {
        renderer.setAnimationLoop(document.hidden || !visible || reduced.matches ? null : time => render(time))
        if (!document.hidden && visible) draw()
      }
      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return
        renderer.setSize(host.clientWidth, host.clientHeight, false)
        camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); draw()
      }
      const pointerMove = (event: PointerEvent) => {
        pointer.x = Math.max(-1, Math.min(1, event.clientX / innerWidth * 2 - 1))
        pointer.y = Math.max(-1, Math.min(1, event.clientY / innerHeight * 2 - 1))
        if (reduced.matches) draw()
      }
      const resetPointer = () => { pointer.x = 0; pointer.y = 0; if (reduced.matches) draw() }
      const lost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setReady(false) }
      const stopResize = observeElementResize([host], resize)
      const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; visibility() }) : null
      observer?.observe(host)
      document.addEventListener('visibilitychange', visibility)
      document.addEventListener('pointermove', pointerMove, { passive: true })
      window.addEventListener('blur', resetPointer)
      reduced.addEventListener('change', visibility)
      renderer.domElement.addEventListener('webglcontextlost', lost)
      refresh.current = draw
      resize(); visibility(); setReady(true)
      cleanup = () => {
        renderer.setAnimationLoop(null); observer?.disconnect(); stopResize()
        document.removeEventListener('visibilitychange', visibility)
        document.removeEventListener('pointermove', pointerMove)
        window.removeEventListener('blur', resetPointer)
        reduced.removeEventListener('change', visibility)
        renderer.domElement.removeEventListener('webglcontextlost', lost)
        const geometries = new Set<Three.BufferGeometry>(), materials = new Set<Three.Material>()
        scene.traverse(object => { const mesh = object as Three.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material) })
        for (const geometry of geometries) geometry.dispose()
        for (const material of materials) material.dispose()
        key.shadow.map?.dispose(); renderer.dispose(); renderer.domElement.remove(); refresh.current = () => {}
      }
    }).catch(() => { if (!disposed) setReady(false) })
    return () => { disposed = true; cleanup() }
  }, [])

  return <div className={`homie-scene${ready ? ' is-ready' : ''}`} data-homie-state={state}>
    <img className="homie-scene__poster" src="/images/auth/homie-poster.webp" width="480" height="480" alt="" aria-hidden="true" />
    <div ref={hostRef} className="homie-scene__canvas" aria-hidden="true" />
  </div>
}
