import assert from 'node:assert/strict'
import test from 'node:test'
import { JSDOM } from 'jsdom'
import { glassSceneTone } from '../src/components/ui/glassSceneTone.ts'

test('glass ink recognizes CSS color-mix output, dark paint, inherited paint and unknown photographs', () => {
  const dom = new JSDOM('<main><section><button>Homeji</button></section></main>')
  const button = dom.window.document.querySelector('button')
  const paints = new Map()
  const original = globalThis.getComputedStyle
  globalThis.getComputedStyle = element => paints.get(element) ?? { backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none' }
  const scene = button.parentElement
  const tone = (color, backgroundImage = 'none') => {
    paints.set(scene, { backgroundColor: color, backgroundImage })
    return glassSceneTone(button, new Map())
  }
  try {
    assert.equal(tone('color(srgb 0.94 0.97 0.96)'), 'light', 'color-mix on a light panel must not produce white text')
    assert.equal(tone('color(srgb 0.08 0.12 0.16)'), 'dark')
    assert.equal(tone('color(srgb 0.94 0.97 0.96 / 0.9)'), 'light')
    assert.equal(tone('rgb(235, 240, 238)'), 'light')
    assert.equal(tone('rgb(22, 38, 45)'), 'dark')
    assert.equal(tone('rgb(255, 255, 255)', 'url("photo.jpg")'), 'mixed', 'background color cannot predict the photo over it')
    assert.equal(tone('transparent', 'linear-gradient(color(srgb .8 .9 .8), color(srgb .9 .8 .9))'), 'light')
    paints.set(scene.parentElement, { backgroundColor: 'rgb(240, 240, 240)', backgroundImage: 'none' })
    assert.equal(tone('rgba(0, 0, 0, 0)'), 'light')
  } finally { globalThis.getComputedStyle = original; dom.window.close() }
})
