import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { BufferGeometry, NormalBufferAttributes } from 'three'

/** Decorative only: authentication never depends on WebGL or animation loading. */
export function AuthCityScene({ mode }: { mode: 'signin' | 'signup' }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}
    void import('three').then((T) => {
      if (disposed) return
      let renderer: InstanceType<typeof T.WebGLRenderer>
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }) } catch { return }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      host.appendChild(renderer.domElement)
      const scene = new T.Scene()
      const world = new T.Group()
      scene.add(world)
      const camera = new T.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.set(10, 9, 13)
      camera.lookAt(0, 0.6, 0)
      scene.add(new T.HemisphereLight(0xfff4dc, 0x48564a, 2.4))
      const sun = new T.DirectionalLight(0xffc483, 3)
      sun.position.set(-4, 8, 5)
      scene.add(sun)
      const materials = new Set<InstanceType<typeof T.MeshStandardMaterial>>()
      const geometries = new Set<InstanceType<typeof T.BufferGeometry>>()
      const material = (color: number) => { const m = new T.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }); materials.add(m); return m }
      const earth = material(0xb97149), grass = material(0x7ca785), cream = material(0xffe4b9), roof = material(0xc97552), jade = material(0x3c775d), water = material(0x73bcb5), glass = material(0x5e8f95)
      const mesh = (geometry: BufferGeometry<NormalBufferAttributes>, mat: InstanceType<typeof T.MeshStandardMaterial>, x: number, y: number, z: number, parent = world) => {
        geometries.add(geometry)
        const object = new T.Mesh(geometry, mat); object.position.set(x, y, z); parent.add(object); return object
      }
      mesh(new T.CylinderGeometry(4.5, 3.8, 0.8, 8), earth, 0, -0.65, 0)
      mesh(new T.CylinderGeometry(4.5, 4.5, 0.12, 8), grass, 0, -0.18, 0)
      mesh(new T.BoxGeometry(1.1, 0.06, 7), water, -0.7, -0.08, 0).rotation.y = -0.25
      mesh(new T.BoxGeometry(3.2, 0.13, 0.65), cream, -0.6, 0.02, 0.6)
      // Artistic hills framing the city, not a geographical reconstruction.
      for (const [x, z, h] of [[-2.4, -2, 1.6], [-1, -3, 2.2], [0.5, -3, 1.4]]) {
        mesh(new T.ConeGeometry(1.1, h, 5), jade, x!, h! / 2, z!)
      }
      const buildings = new T.Group(); world.add(buildings)
      for (const [x, z, h] of [[1.1, 1.9, 1], [2.4, 0.9, 1.4], [2.4, -0.7, 1.2], [-2.6, 0.8, 0.8]]) {
        mesh(new T.BoxGeometry(0.95, h!, 0.85), cream, x!, h! / 2, z!, buildings)
        mesh(new T.ConeGeometry(0.8, 0.45, 4), roof, x!, h! + 0.22, z!, buildings).rotation.y = Math.PI / 4
        for (let floor = 0; floor < 2; floor++) mesh(new T.BoxGeometry(0.18, 0.18, 0.025), glass, x! - 0.2, 0.3 + floor * 0.4, z! + 0.44, buildings)
      }
      mesh(new T.BoxGeometry(0.6, 3.5, 0.6), glass, 1, 1.75, -1.4, buildings)
      mesh(new T.BoxGeometry(0.35, 0.7, 0.35), cream, 1, 3.8, -1.4, buildings)
      mesh(new T.CylinderGeometry(0.035, 0.035, 0.9, 6), jade, 1, 4.4, -1.4, buildings)
      const marker = new T.Group(); world.add(marker)
      mesh(new T.SphereGeometry(0.25, 12, 8), roof, 2.4, 2.25, 0.9, marker)
      mesh(new T.ConeGeometry(0.18, 0.35, 8), roof, 2.4, 2, 0.9, marker).rotation.z = Math.PI
      const clouds = new T.Group(); world.add(clouds)
      for (const [x, z] of [[-2, -1], [1, 2]]) for (let i = 0; i < 3; i++) mesh(new T.SphereGeometry(0.35, 10, 6), cream, x! + i * 0.38, 4.4 + (i === 1 ? 0.12 : 0), z!, clouds)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      const context = gsap.context(() => {
        if (!reduced.matches) {
          gsap.from(world.scale, { x: 0.85, y: 0.85, z: 0.85, duration: 1.3, ease: 'power2.out' })
          gsap.to(marker.position, { y: 0.2, repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' })
          gsap.to(clouds.position, { x: 0.5, repeat: -1, yoyo: true, duration: 5, ease: 'sine.inOut' })
        }
      })
      const render = () => renderer.render(scene, camera)
      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        renderer.setSize(Math.max(1, width), Math.max(1, height), false)
        camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); render()
      }
      const visibility = () => {
        const animate = !document.hidden && !reduced.matches
        context.getTweens().forEach((tween: gsap.core.Tween) => animate ? tween.resume() : tween.pause())
        renderer.setAnimationLoop(animate ? render : null); render()
      }
      const pointer = (event: PointerEvent) => {
        if (reduced.matches) return
        const bounds = host.getBoundingClientRect()
        world.rotation.y = Math.max(-0.12, Math.min(0.12, (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 0.25))
      }
      const lost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setReady(false) }
      const observer = new ResizeObserver(resize); observer.observe(host)
      document.addEventListener('visibilitychange', visibility)
      reduced.addEventListener('change', visibility)
      host.addEventListener('pointermove', pointer)
      renderer.domElement.addEventListener('webglcontextlost', lost)
      resize(); visibility(); setReady(true)
      cleanup = () => {
        renderer.setAnimationLoop(null); context.revert(); observer.disconnect()
        document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', visibility)
        host.removeEventListener('pointermove', pointer); renderer.domElement.removeEventListener('webglcontextlost', lost)
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove()
      }
    }).catch(() => { /* Keep the static landscape; do not block the form. */ })
    return () => { disposed = true; cleanup() }
  }, [])
  useEffect(() => {
    if (!hostRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const context = gsap.context(() => { gsap.fromTo(hostRef.current, { opacity: 0.65, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }) })
    return () => context.revert()
  }, [mode])
  return <div className={`auth-city${ready ? ' is-ready' : ''}`}>
    <div className="auth-city__copy"><span>HOMEJI · TP. HỒ CHÍ MINH</span><h2>Một góc Sài Gòn.<br />Một nơi gọi là nhà.</h2><p>Giữa nhịp sống rộn ràng, tìm căn phòng và những người bạn hợp gu.</p></div>
    <div ref={hostRef} className="auth-city__canvas" aria-hidden="true"><div className="auth-city__static">⌂<span>Thủ Đức · Sài Gòn</span></div></div>
    <span className="auth-city__caption">Đất xanh, mái ấm, hành trình mới.</span>
  </div>
}
