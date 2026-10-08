import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { BufferGeometry, NormalBufferAttributes } from 'three'
import './AuthCityScene.css'

/** Decorative only: authentication never depends on WebGL or animation loading. */
export function AuthCityScene({ mode }: { mode: 'signin' | 'signup' }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [night, setNight] = useState(false)
  const [paused, setPaused] = useState(false)
  const actionRef = useRef<(action: 'day' | 'night' | 'explore' | 'home') => void>(() => {})
  const pausedRef = useRef(false)
  const refreshRef = useRef<() => void>(() => {})
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
      const camera = new T.OrthographicCamera(-7, 7, 4.6, -4.6, 0.1, 100)
      camera.position.set(10, 9, 13)
      camera.lookAt(0, 1.8, 0)
      const ambient = new T.HemisphereLight(0xfff4dc, 0x48564a, 2.4)
      scene.add(ambient)
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
      const riverShape = new T.Shape()
      riverShape.moveTo(-1.5, -4.1)
      riverShape.bezierCurveTo(-3, -1.5, 0.8, 0.5, -1.4, 4.1)
      riverShape.lineTo(-0.55, 4.2)
      riverShape.bezierCurveTo(1.8, 0.5, -2, -1.5, -0.65, -4.2)
      riverShape.closePath()
      mesh(new T.ShapeGeometry(riverShape, 24), water, 0, -0.07, 0).rotation.x = -Math.PI / 2
      mesh(new T.BoxGeometry(3.2, 0.13, 0.65), cream, -0.6, 0.02, 0.6)
      for (const side of [-1, 1]) mesh(new T.BoxGeometry(3.2, 0.12, 0.06), roof, -0.6, 0.15, 0.6 + side * 0.29)
      mesh(new T.BoxGeometry(0.45, 0.04, 6), cream, 1.5, -0.04, 0.3)
      // Artistic hills framing the city, not a geographical reconstruction.
      for (const [x, z, h] of [[-2.4, -2, 1.6], [-1, -3, 2.2], [0.5, -3, 1.4]]) {
        mesh(new T.ConeGeometry(1.1, h, 5), jade, x!, h! / 2, z!)
      }
      const buildings = new T.Group(); world.add(buildings)
      const windowLight = material(0xffd589)
      windowLight.emissive.setHex(0xffb65c)
      windowLight.emissiveIntensity = 0.1
      for (const [x, z, h] of [[1.1, 1.9, 1], [2.4, 0.9, 1.4], [2.4, -0.7, 1.2], [-2.6, 0.8, 0.8]]) {
        mesh(new T.BoxGeometry(0.95, h!, 0.85), cream, x!, h! / 2, z!, buildings)
        mesh(new T.ConeGeometry(0.8, 0.45, 4), roof, x!, h! + 0.22, z!, buildings).rotation.y = Math.PI / 4
        for (let floor = 0; floor < 2; floor++) for (const offset of [-0.23, 0.23]) mesh(new T.BoxGeometry(0.18, 0.18, 0.025), windowLight, x! + offset, 0.3 + floor * 0.4, z! + 0.44, buildings)
        mesh(new T.BoxGeometry(0.2, 0.38, 0.025), glass, x!, 0.19, z! + 0.445, buildings)
      }
      mesh(new T.BoxGeometry(0.6, 3.5, 0.6), glass, 1, 1.75, -1.4, buildings)
      mesh(new T.BoxGeometry(0.35, 0.7, 0.35), cream, 1, 3.8, -1.4, buildings)
      mesh(new T.CylinderGeometry(0.035, 0.035, 0.9, 6), jade, 1, 4.4, -1.4, buildings)
      // Additional stepped skyline and a Bitexco-inspired helipad.
      for (const [x, height] of [[0.6, 2.2], [1.4, 2.8]]) {
        mesh(new T.BoxGeometry(0.3, height, 0.5), glass, x, height / 2, -1.4, buildings)
        for (let y = 0.4; y < height; y += 0.35) mesh(new T.BoxGeometry(0.31, 0.025, 0.51), cream, x, y, -1.4, buildings)
      }
      mesh(new T.CylinderGeometry(0.22, 0.38, 2.5, 8), glass, 2.6, 1.25, -2.2, buildings)
      mesh(new T.CylinderGeometry(0.5, 0.5, 0.08, 16), cream, 2.85, 1.9, -2.2, buildings)
      for (const [x, z] of [[-3.2, 1.8], [-2, 2.6], [0.4, 3.1], [3.3, 0], [-3.4, -0.3]]) {
        mesh(new T.CylinderGeometry(0.06, 0.08, 0.45, 6), earth, x, 0.13, z)
        mesh(new T.IcosahedronGeometry(0.38, 0), jade, x, 0.6, z)
      }
      const boat = new T.Group(); world.add(boat)
      boat.position.set(-1, 0, 2.5)
      mesh(new T.BoxGeometry(0.3, 0.12, 0.65), roof, 0, 0, 0, boat)
      mesh(new T.BoxGeometry(0.22, 0.18, 0.26), cream, 0, 0.12, 0, boat)
      const sunOrb = mesh(new T.IcosahedronGeometry(0.55, 2), windowLight, -3.6, 4.1, -2.5)
      const marker = new T.Group(); world.add(marker)
      mesh(new T.SphereGeometry(0.25, 12, 8), roof, 2.4, 2.25, 0.9, marker)
      mesh(new T.ConeGeometry(0.18, 0.35, 8), roof, 2.4, 2, 0.9, marker).rotation.z = Math.PI
      const clouds = new T.Group(); world.add(clouds)
      for (const [x, z] of [[-2, -1], [1, 2]]) for (let i = 0; i < 3; i++) mesh(new T.SphereGeometry(0.35, 10, 6), cream, x! + i * 0.38, 4.4 + (i === 1 ? 0.12 : 0), z!, clouds)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      const context = gsap.context(() => {})
      const motion = gsap.matchMedia()
      motion.add('(prefers-reduced-motion: no-preference)', () => {
          gsap.from(world.scale, { x: 0.85, y: 0.85, z: 0.85, duration: 1.3, ease: 'power2.out' })
          gsap.to(marker.position, { y: 0.2, repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut' })
          gsap.to(clouds.position, { x: 0.5, repeat: -1, yoyo: true, duration: 5, ease: 'sine.inOut' })
          gsap.from(buildings.position, { y: -0.7, duration: 1.4, ease: 'back.out(1.3)' })
          gsap.to(boat.position, { z: 3.1, repeat: -1, yoyo: true, duration: 5, ease: 'sine.inOut' })
          gsap.to(world.position, { y: 0.1, repeat: -1, yoyo: true, duration: 4, ease: 'sine.inOut' })
      })
      let contextLost = false
      const render = () => { if (!contextLost && !disposed) renderer.render(scene, camera) }
      const transition = (target: object, values: gsap.TweenVars) => {
        if (reduced.matches || pausedRef.current) { gsap.set(target, values); render(); return }
        context.add(() => { gsap.to(target, { ...values, duration: 1.1, ease: 'power2.inOut', overwrite: 'auto', onUpdate: render }) })
      }
      actionRef.current = action => {
        if (action === 'day' || action === 'night') {
          const dark = action === 'night'
          transition(ambient, { intensity: dark ? 0.75 : 2.4 })
          transition(sun, { intensity: dark ? 0.5 : 3 })
          transition(windowLight, { emissiveIntensity: dark ? 2 : 0.1 })
          transition(sunOrb.scale, { x: dark ? 0.55 : 1, y: dark ? 0.55 : 1, z: dark ? 0.55 : 1 })
        } else transition(world.rotation, { y: action === 'explore' ? world.rotation.y + Math.PI / 2 : 0 })
      }
      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        renderer.setSize(Math.max(1, width), Math.max(1, height), false)
        const aspect = Math.max(1, width) / Math.max(1, height)
        camera.left = -4.6 * aspect; camera.right = 4.6 * aspect
        camera.updateProjectionMatrix(); render()
      }
      const visibility = () => {
        const animate = !document.hidden && !reduced.matches && !pausedRef.current && !contextLost
        ;[...context.getTweens(), ...motion.contexts.flatMap(item => item.getTweens())].forEach((tween: gsap.core.Tween) => animate ? tween.resume() : tween.pause())
        renderer.setAnimationLoop(animate ? render : null); render()
      }
      refreshRef.current = visibility
      let tilt: ReturnType<typeof gsap.quickTo>
      context.add(() => { tilt = gsap.quickTo(world.rotation, 'x', { duration: 0.6, ease: 'power2.out' }) })
      const pointer = (event: PointerEvent) => {
        if (reduced.matches || pausedRef.current || contextLost) return
        const bounds = host.getBoundingClientRect()
        tilt((event.clientY - bounds.top - bounds.height / 2) / bounds.height * 0.08)
      }
      const lost = (event: Event) => { event.preventDefault(); contextLost = true; visibility(); setReady(false) }
      const restored = () => { contextLost = false; resize(); visibility(); setReady(true) }
      const observer = new ResizeObserver(resize); observer.observe(host)
      document.addEventListener('visibilitychange', visibility)
      reduced.addEventListener('change', visibility)
      host.addEventListener('pointermove', pointer)
      renderer.domElement.addEventListener('webglcontextlost', lost)
      renderer.domElement.addEventListener('webglcontextrestored', restored)
      resize(); visibility(); setReady(true)
      cleanup = () => {
        actionRef.current = () => {}; refreshRef.current = () => {}
        renderer.setAnimationLoop(null); motion.revert(); context.revert(); observer.disconnect()
        document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', visibility)
        host.removeEventListener('pointermove', pointer); renderer.domElement.removeEventListener('webglcontextlost', lost)
        renderer.domElement.removeEventListener('webglcontextrestored', restored)
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove()
      }
    }).catch(() => { /* Keep the static landscape; do not block the form. */ })
    return () => { disposed = true; cleanup() }
  }, [])
  useEffect(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => { gsap.fromTo(hostRef.current, { opacity: 0.65, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }) })
    return () => media.revert()
  }, [mode])
  return <section className={`auth-city${ready ? ' is-ready' : ''}${night ? ' is-night' : ''}`} aria-label="Một góc Sài Gòn thu nhỏ">
    <div className="auth-city__copy"><span>HOMEJI · MỘT NƠI ĐỂ THUỘC VỀ</span><h2>{mode === 'signup' ? <>Hành trình mới.<br />Bắt đầu từ một mái nhà.</> : <>Sài Gòn rộng lớn.<br />Có một nơi chờ bạn.</>}</h2><p>Qua những ngọn đồi, dọc một dòng sông. Tìm căn phòng nhỏ và những người bạn cùng viết câu chuyện lớn.</p></div>
    <div className="auth-city__landscape">
      <span className="auth-city__label auth-city__label--city">SÀI GÒN<small>Nhịp sống mới</small></span>
      <span className="auth-city__label auth-city__label--home">THỦ ĐỨC<small>Mái ấm của bạn</small></span>
      <div ref={hostRef} className="auth-city__canvas" aria-hidden="true"><div className="auth-city__static"><svg viewBox="0 0 600 360"><ellipse cx="300" cy="310" rx="220" ry="20" fill="#24382d" opacity=".08"/><path d="M70 240 290 160 530 240 310 340Z" fill="#a76e53"/><path d="M70 225 290 140 530 225 310 315Z" fill="#91ab7e"/><path d="m125 208 65-132 70 107 48-130 84 134" fill="#376958"/><path d="m240 278 55-108 70 97" fill="#75b3ad"/><path d="M355 130h36v95h-36zm42-70h23v155h-23" fill="#416b70"/><path d="M320 238v-66h65v66zm-110 25v-58h62v58z" fill="#f8ddb0"/><path d="m309 172 44-30 45 30zm-111 32 43-27 42 27" fill="#d87351"/></svg></div></div>
    </div>
    <div className="auth-city__controls" aria-label="Khám phá mô hình Sài Gòn">
      <button type="button" onClick={() => { actionRef.current(night ? 'day' : 'night'); setNight(!night) }} aria-pressed={night}>{night ? '☀ Ban ngày' : '☾ Lên đèn'}</button>
      <button type="button" onClick={() => actionRef.current('explore')} disabled={!ready}>↻ Dạo một vòng</button>
      <button type="button" onClick={() => actionRef.current('home')} disabled={!ready}>⌂ Về mái ấm</button>
      <button type="button" onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); refreshRef.current() }} aria-pressed={paused} disabled={!ready}>{paused ? 'Tiếp tục' : 'Dừng chuyển động'}</button>
    </div>
    <span className="auth-city__caption">TP. Hồ Chí Minh · Phong cảnh cách điệu, cảm hứng từ những mái nhà.</span>
  </section>
}
