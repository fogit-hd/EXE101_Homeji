import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { HomieState } from './HomieScene'

export function createHomieModel() {
  const root = new T.Group()
  root.name = 'Homie'
  const house = new T.Group()
  house.name = 'homie-house'
  root.add(house)
  const cream = new T.MeshStandardMaterial({ color: '#ffe9c8', roughness: .76 })
  const roofMaterial = new T.MeshStandardMaterial({ color: '#cb6333', roughness: .78 })
  const green = new T.MeshStandardMaterial({ color: '#087653', roughness: .72 })
  const ink = new T.MeshStandardMaterial({ color: '#352017', roughness: .34 })
  const white = new T.MeshStandardMaterial({ color: '#fffdf6', roughness: .3 })
  const pink = new T.MeshStandardMaterial({ color: '#efb38e', roughness: .9 })
  const tongueMaterial = new T.MeshStandardMaterial({ color: '#e5906d', roughness: .8 })
  const sphere = new T.SphereGeometry(1, 32, 24)
  function ball(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    const mesh = new T.Mesh(sphere, material)
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true
    parent.add(mesh)
    return mesh
  }
  function rounded(parent: T.Object3D, material: T.Material, x: number, y: number, z: number, w: number, h: number, d: number, radius: number) {
    const mesh = new T.Mesh(new RoundedBoxGeometry(w, h, d, 6, radius), material)
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh)
    return mesh
  }
  function arc(parent: T.Object3D, points: T.Vector3[], material: T.Material, radius = .025) {
    const mesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, radius, 8, false), material)
    parent.add(mesh); return mesh
  }
  const bodyShape = new T.Shape()
    .moveTo(-.73, .5)
    .bezierCurveTo(-1.01, .59, -1.02, 1.57, -.88, 2.1)
    .lineTo(0, 3.0).lineTo(.88, 2.1)
    .bezierCurveTo(1.02, 1.57, 1.01, .59, .73, .5)
    .quadraticCurveTo(0, .31, -.73, .5).closePath()
  const body = new T.Mesh(new T.ExtrudeGeometry(bodyShape, { depth: .68, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .16, bevelThickness: .18 }), cream)
  body.position.z = -.34; body.castShadow = true; body.receiveShadow = true; house.add(body)
  for (const side of [-1, 1]) {
    const roof = rounded(house, roofMaterial, side * .56, 2.59, 0, 1.65, .32, 1.3, .15)
    roof.rotation.z = -side * .66
    rounded(root, cream, side * .43, .28, .1, .48, .45, .63, .18)
  }
  rounded(house, roofMaterial, .58, 2.75, -.18, .3, .65, .42, .1)
  const eyes: T.Group[] = []
  const closedEyes: T.Mesh[] = []
  const brows: T.Group[] = []
  for (const side of [-1, 1]) {
    const eye = new T.Group(); eye.position.set(side * .38, 1.78, .558); house.add(eye)
    ball(eye, ink, 0, 0, 0, .175, .225, .07)
    ball(eye, white, -.046, .07, .061, .052, .06, .024)
    ball(eye, white, .05, -.055, .063, .022, .026, .015)
    eyes.push(eye)
    const closed = arc(house, [new T.Vector3(side * .38 - .15, 1.79, .61), new T.Vector3(side * .38, 1.85, .62), new T.Vector3(side * .38 + .15, 1.79, .61)], ink, .027)
    closed.name = `closed-eye-${side}`; closed.visible = false; closedEyes.push(closed)
    const brow = new T.Group(); brow.position.set(side * .38, 2.12, .55); house.add(brow)
    arc(brow, [new T.Vector3(-.08, -.02, 0), new T.Vector3(0, .02, .015), new T.Vector3(.08, -.02, 0)], ink, .023)
    brows.push(brow)
    ball(house, pink, side * .65, 1.47, .53, .17, .09, .018)
  }
  const mouth = new T.Group(); mouth.position.set(0, 1.4, .575); house.add(mouth)
  const smileShape = new T.Shape().moveTo(-.14, .045).quadraticCurveTo(0, -.005, .14, .045)
    .quadraticCurveTo(.13, -.15, 0, -.16).quadraticCurveTo(-.13, -.15, -.14, .045).closePath()
  mouth.add(new T.Mesh(new T.ShapeGeometry(smileShape), ink))
  const tongue = ball(mouth, tongueMaterial, 0, -.105, .014, .08, .038, .012)
  rounded(house, green, 0, .79, .55, .5, .68, .13, .14)
  ball(house, cream, .12, .8, .64, .045)
  const hands = [-1, 1].map(side => {
    const hand = new T.Group(); hand.name = side < 0 ? 'hand-left' : 'hand-right'; hand.position.set(side * 1.12, 1.15, .22); house.add(hand)
    ball(hand, cream, 0, 0, 0, .24, .25, .17)
    for (let i = 0; i < 4; i++) ball(hand, cream, (i - 1.5) * .09, .19 - Math.abs(i - 1.5) * .025, .025, .065, .11, .075)
    ball(hand, cream, -side * .2, .015, .07, .085, .13, .1)
    const arm = ball(house, cream, side, 1.16, 0, .18, .4, .18)
    return { hand, arm, shoulder: new T.Vector3(side * .82, 1.23, 0), side }
  })
  const up = new T.Vector3(0, 1, 0), delta = new T.Vector3(), target = new T.Vector3(), coverTarget = new T.Vector3()
  let lastState: HomieState = 'idle', stateSince = 0
  let conceal = 0
  function update(state: HomieState, progress: number, pointer: { x: number; y: number }, time: number, dt: number, reduced: boolean) {
    if (lastState !== state) { lastState = state; stateSince = time }
    const age = time - stateSince
    const secret = state === 'password' || state === 'peek'
    conceal = reduced ? Number(secret) : T.MathUtils.damp(conceal, Number(secret), 13, dt)
    const curious = state === 'submitting', happy = state === 'success', sad = state === 'error'
    const idleTime = reduced ? 0 : time
    const jump = !reduced && happy && age < .85 ? Math.sin(Math.min(age / .85, 1) * Math.PI) * .32 : 0
    root.position.y = jump + (reduced ? 0 : Math.sin(idleTime * 1.8) * .025)
    house.rotation.y = T.MathUtils.damp(house.rotation.y, secret ? -.06 : pointer.x * .16 + (state === 'typing' ? (progress - .5) * .09 : 0), 8, dt || 1)
    house.rotation.z = T.MathUtils.damp(house.rotation.z, curious ? -.09 + (reduced ? 0 : Math.sin(age * 2.4) * .035) : sad ? .035 : 0, 8, dt || 1)
    house.rotation.x = T.MathUtils.damp(house.rotation.x, secret ? .055 : curious ? -.065 : sad ? .08 : pointer.y * .04, 8, dt || 1)
    for (let i = 0; i < eyes.length; i++) {
      const blink = !reduced && Math.sin(time * 1.1) > .998
      eyes[i].visible = !happy && !blink
      closedEyes[i].visible = happy || blink
      eyes[i].position.x = (i === 0 ? -1 : 1) * .38 + (secret ? 0 : pointer.x * .025 + (state === 'typing' ? (progress - .5) * .05 : 0))
      eyes[i].scale.y = sad ? .88 : curious ? 1.08 : 1
      brows[i].rotation.z = sad ? (i === 0 ? -.3 : .3) : curious ? (i === 0 ? .15 : -.2) : 0
      brows[i].position.y = curious ? 2.18 : 2.12
    }
    mouth.scale.set(curious ? .6 : sad ? .7 : 1, curious ? .85 : sad ? .3 : 1, 1)
    mouth.rotation.z = sad ? Math.PI : 0
    tongue.visible = !sad && !curious
    for (const { hand, arm, shoulder, side } of hands) {
      const periodicWave = !reduced && !secret && !curious && !sad && !happy && side === 1 && time % 12 < 2.1
      const raised = happy || periodicWave
      target.set(side * (curious ? .78 : raised ? 1.28 : 1.29), curious ? 1.3 : raised ? 1.96 : 1.04, curious ? .6 : .4)
      if (periodicWave) target.x += Math.sin(time * 8) * .08
      target.lerp(coverTarget.set(side * .38, 1.8, .82), conceal)
      const smoothing = reduced ? 1 : 1 - Math.exp(-14 * dt)
      hand.position.lerp(target, smoothing)
      hand.rotation.z = secret ? side * -.12 : raised ? -side * .35 : side * .22
      arm.position.copy(shoulder).lerp(hand.position, .5)
      delta.subVectors(hand.position, shoulder)
      arm.scale.set(.17, delta.length() * .62, .17)
      arm.quaternion.setFromUnitVectors(up, delta.normalize())
    }
  }
  return { root, update }
}
