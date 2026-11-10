import assert from 'node:assert/strict'
import test from 'node:test'
import { maneuverGlyph } from '../src/lib/maneuverGlyph.ts'

test('ordinary turns are not drawn as U-turns', () => {
  assert.equal(maneuverGlyph('TURN_RIGHT'), '↱')
  assert.equal(maneuverGlyph('TURN_SLIGHT_LEFT'), '↰')
  assert.equal(maneuverGlyph('turn-sharp-right'), '↱')
})

test('real U-turns keep the U-turn arrow in both code styles', () => {
  assert.equal(maneuverGlyph('UTURN_LEFT'), '↶')
  assert.equal(maneuverGlyph('uturn-right'), '↷')
})

test('other maneuvers and missing codes', () => {
  assert.equal(maneuverGlyph('ROUNDABOUT_LEFT'), '↻')
  assert.equal(maneuverGlyph('STRAIGHT'), '↑')
  assert.equal(maneuverGlyph('DEPART'), '●')
  assert.equal(maneuverGlyph(null), '→')
})
