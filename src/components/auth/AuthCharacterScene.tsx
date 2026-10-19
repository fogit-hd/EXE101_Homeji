import { useEffect, useRef, useState } from 'react'
import { observeElementResize } from '../../lib/observeElementResize'
import type { Mesh, Object3D, Quaternion, SkinnedMesh } from 'three'
import './AuthCharacterScene.css'

type CharacterState = 'idle' | 'typing' | 'password' | 'peek' | 'error' | 'success' | 'submitting'
const captions: Record<CharacterState, string> = {
  idle: 'Chào bạn, mình là bạn đồng hành Homeji.',
  typing: 'Mình đang lắng nghe bạn nè.',
  password: 'Bạn nhập mật khẩu nhé. Mình che mắt rồi!',
  peek: 'Dù bạn hiện mật khẩu, mình vẫn không nhìn đâu.',
  error: 'Kiểm tra lại một chút nhé. Mình chờ bạn.',
  success: 'Tuyệt rồi! Chào mừng bạn đến với Homeji.',
  submitting: 'Chờ một chút, mái ấm mới sắp sẵn sàng.',
}

/** Receives interaction state only. Passwords and personal input never enter the scene. */
export function AuthCharacterScene({ state, progress }: { state: CharacterState; progress: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const interaction = useRef({ state, progress })
  const refresh = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    interaction.current = { state, progress }
    refresh.current()
  }, [state, progress])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let cleanup = () => {}
    const disposeModel = (root: Object3D) => {
      root.traverse((object) => {
        const mesh = object as Mesh
        ;(object as SkinnedMesh).skeleton?.dispose()
        mesh.geometry?.dispose()
        if (!mesh.material) return
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value && typeof value === 'object' && 'isTexture' in value) value.dispose()
          }
          material.dispose()
        }
      })
    }

    void Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js')]).then(async ([T, { GLTFLoader }]) => {
      if (disposed) return
      let renderer: InstanceType<typeof T.WebGLRenderer>
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true }) } catch { return }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setClearColor(0x000000, 0)
      host.appendChild(renderer.domElement)
      const scene = new T.Scene()
      const camera = new T.PerspectiveCamera(32, 1, 0.1, 100)
      camera.position.set(0, 2.1, 9.5)
      camera.lookAt(0, 2, 0)
      scene.add(new T.HemisphereLight(0xffffff, 0x63867d, 2.6))
      const light = new T.DirectionalLight(0xfff0dc, 3.2)
      light.position.set(3, 6, 5)
      scene.add(light)
      const rim = new T.DirectionalLight(0x72dcc7, 2)
      rim.position.set(-4, 3, -2)
      scene.add(rim)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
      const pointer = { x: 0, y: 0 }
      const followPointer = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect()
        pointer.x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / Math.max(bounds.width, 1)))
        pointer.y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / Math.max(bounds.height, 1)))
        if (reduced.matches) draw()
      }
      const resetPointer = () => { pointer.x = 0; pointer.y = 0 }
      let model: Object3D | undefined
      let mixer: InstanceType<typeof T.AnimationMixer> | undefined
      let draw = () => renderer.render(scene, camera)
      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        draw()
      }
      const stopObserving = observeElementResize([host], resize)
      const visibility = () => {
        renderer.setAnimationLoop(document.hidden || reduced.matches ? null : draw)
        if (!document.hidden) draw()
      }
      const contextLost = (event: Event) => {
        event.preventDefault()
        renderer.setAnimationLoop(null)
        setReady(false)
      }
      document.addEventListener('visibilitychange', visibility)
      document.addEventListener('pointermove', followPointer, { passive: true })
      window.addEventListener('blur', resetPointer)
      reduced.addEventListener('change', visibility)
      renderer.domElement.addEventListener('webglcontextlost', contextLost)
      cleanup = () => {
        renderer.setAnimationLoop(null)
        stopObserving()
        document.removeEventListener('visibilitychange', visibility)
        document.removeEventListener('pointermove', followPointer)
        window.removeEventListener('blur', resetPointer)
        reduced.removeEventListener('change', visibility)
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        mixer?.stopAllAction()
        if (model) mixer?.uncacheRoot(model)
        if (model) disposeModel(model)
        renderer.dispose()
        renderer.domElement.remove()
        refresh.current = () => {}
      }

      try {
        const gltf = await new GLTFLoader().loadAsync('/models/auth/RobotExpressive.glb')
        if (disposed) { disposeModel(gltf.scene); return }
        model = gltf.scene
        const box = new T.Box3().setFromObject(model)
        const size = box.getSize(new T.Vector3())
        const center = box.getCenter(new T.Vector3())
        const scale = 3.8 / size.y
        model.scale.multiplyScalar(scale)
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale)
        scene.add(model)
        mixer = new T.AnimationMixer(model)
        const idleClip = T.AnimationClip.findByName(gltf.animations, 'Idle')
        if (idleClip) mixer.clipAction(idleClip).play()
        const waveClip = T.AnimationClip.findByName(gltf.animations, 'Wave')
        const wave = waveClip ? mixer.clipAction(waveClip).setLoop(T.LoopOnce, 1) : undefined
        let nextWave = 0
        const find = (name: string) => model!.getObjectByName(name.replaceAll('.', '')) ?? model!.getObjectByName(name)
        const head = find('Head')
        const headRest = head?.quaternion.clone()
        const arms = ['L', 'R'].map((side) => {
          const upper = find(`UpperArm.${side}`)
          const lower = find(`LowerArm.${side}`)
          const palm = find(`Palm2.${side}`)
          return { upper, lower, palm, rest: [upper?.quaternion.clone(), lower?.quaternion.clone()], covered: null as [Quaternion, Quaternion] | null }
        })
        const faces: SkinnedMesh[] = []
        model.traverse((object) => {
          if ((object as SkinnedMesh).morphTargetDictionary) faces.push(object as SkinnedMesh)
        })
        const eyes = faces.find((face) => !Array.isArray(face.material) && face.material.name === 'Black')
        const eyePositions = eyes?.geometry.getAttribute('position')
        const openEyes = eyePositions ? Float32Array.from(eyePositions.array) : undefined
        // Two-joint CCD keeps the existing rig: move palms to the face in world coordinates.
        const end = new T.Vector3(), jointPosition = new T.Vector3()
        const from = new T.Vector3(), to = new T.Vector3()
        const delta = new T.Quaternion(), parentRotation = new T.Quaternion(), worldRotation = new T.Quaternion()
        const target = new T.Vector3()
        const closed = new T.Quaternion()
        let conceal = 0
        let lastTime = performance.now()
        draw = () => {
          if (!model || disposed) return
          const now = performance.now()
          const dt = Math.min((now - lastTime) / 1000, 0.05)
          lastTime = now
          const { state: current, progress: amount } = interaction.current
          const hide = current === 'password' || current === 'peek'
          conceal = reduced.matches ? Number(hide) : T.MathUtils.damp(conceal, Number(hide), 12, dt)
          const time = reduced.matches ? 0 : now / 1000
          if (!reduced.matches) {
            mixer?.update(dt)
            if (!hide && now >= nextWave) {
              wave?.reset().setEffectiveWeight(0.8).play()
              nextWave = now + 12000
            }
          }
          model.position.y = -box.min.y * scale + (reduced.matches ? 0 : Math.sin(time * 1.7) * 0.025)
          if (head && headRest) {
            head.quaternion.copy(headRest)
            head.rotateY(hide ? -0.12 : pointer.x * 0.4 + (current === 'typing' ? (amount - 0.5) * 0.3 : Math.sin(time * 0.6) * 0.04))
            head.rotateX(hide ? 0.12 : current === 'error' ? 0.1 : pointer.y * 0.18)
          }
          for (const face of faces) {
            const dictionary = face.morphTargetDictionary!
            const weights = face.morphTargetInfluences!
            if (dictionary.Surprised !== undefined) weights[dictionary.Surprised] = face === eyes ? 0 : hide ? 0.65 : current === 'typing' ? 0.18 : 0
            if (dictionary.Sad !== undefined) weights[dictionary.Sad] = current === 'error' ? 0.5 : 0
          }
          if (eyePositions && openEyes) {
            const blinkPhase = time % 4.5
            const blink = !reduced.matches && blinkPhase > 4.25 ? Math.sin((blinkPhase - 4.25) / 0.25 * Math.PI) : 0
            const eyelids = Math.max(conceal, blink)
            for (let index = 0; index < eyePositions.count; index++) {
              const x = openEyes[index * 3], y = openEyes[index * 3 + 1], z = openEyes[index * 3 + 2]
              if (Math.abs(x) >= 0.0032 && Math.abs(x) <= 0.011 && y < -0.005 && z < 0.0035) {
                eyePositions.setZ(index, -0.00059 + (z + 0.00059) * (1 - eyelids * 0.93))
              }
            }
            eyePositions.needsUpdate = true
          }
          arms.forEach((arm, index) => {
            const { upper, lower, palm, rest } = arm
            if (!upper || !lower || !palm || !rest[0] || !rest[1] || !head) return
            if (arm.covered) {
              if (reduced.matches) { upper.quaternion.copy(rest[0]); lower.quaternion.copy(rest[1]) }
              upper.quaternion.slerp(arm.covered[0], conceal)
              lower.quaternion.slerp(arm.covered[1], conceal)
              return
            }
            upper.quaternion.copy(rest[0]); lower.quaternion.copy(rest[1])
            model!.updateMatrixWorld(true)
            head.getWorldPosition(target)
            target.x += index === 0 ? 0.27 : -0.27
            target.y += 0.6
            target.z += 1.15
            for (let step = 0; step < 32; step++) for (const joint of [lower, upper]) {
              joint.getWorldPosition(jointPosition)
              palm.getWorldPosition(end)
              from.subVectors(end, jointPosition).normalize()
              to.subVectors(target, jointPosition).normalize()
              delta.setFromUnitVectors(from, to)
              joint.getWorldQuaternion(worldRotation)
              joint.parent!.getWorldQuaternion(parentRotation).invert()
              closed.copy(parentRotation).multiply(delta).multiply(worldRotation)
              joint.quaternion.copy(closed)
              model!.updateMatrixWorld(true)
            }
            arm.covered = [upper.quaternion.clone(), lower.quaternion.clone()]
            upper.quaternion.slerp(rest[0], 1 - conceal)
            lower.quaternion.slerp(rest[1], 1 - conceal)
          })
          renderer.render(scene, camera)
        }
        refresh.current = draw
        resize()
        visibility()
        setReady(true)
      } catch {
        if (!disposed) { cleanup(); setReady(false) }
      }
    }).catch(() => { if (!disposed) cleanup() })
    return () => { disposed = true; cleanup() }
  }, [])

  return <section className="auth-character" data-state={state} aria-label="Bạn đồng hành Homeji">
    <div className="auth-character__copy">
      <span>HOMEJI · HELLO, BẠN MỚI</span>
      <h2>Một người bạn mới.<br />Một nơi để thuộc về.</h2>
      <p>Bắt đầu với vài điều về bạn. Phần còn lại, mình cùng khám phá.</p>
    </div>
    <div className={`auth-character__scene${ready ? ' is-ready' : ''}`}>
      <div ref={hostRef} className="auth-character__canvas" aria-hidden="true" />
      {!ready ? <div className="auth-character__fallback" aria-hidden="true">
        <div className="auth-character__face"><i /><i /><b /></div>
        <div className="auth-character__body" />
      </div> : null}
      <span className="auth-character__halo" aria-hidden="true" />
    </div>
    <p className="auth-character__caption">{captions[state]}</p>
  </section>
}
