/** RGB 0–255, as night → day pairs; the switch mixes each pair as the lens travels to the sun. */
type Color = readonly [number, number, number]
type Pair<T> = readonly [night: T, day: T]
type Stops = readonly [Color, Color, Color]

/**
 * The colours of the theme switch's glass artwork (glassLightArtwork for Canvas 2D, glassLightWebGL
 * for the shader). The app uses APP_GLASS; a surface with its own palette (the guest landing) passes
 * its own, so one switch works everywhere in that surface's colours.
 */
export type GlassPalette = {
  /** The light strip around the lens and its glow. */
  led: Pair<Color>
  /** The track, top to bottom. */
  track: Pair<Stops>
  /** The lens face, top to bottom. */
  face: Pair<Stops>
  /** The lens outline, corner to corner. */
  edge: Pair<Stops>
  /** The moon / sun pixels. */
  ink: Pair<Color>
  /** The glow under the pixels. */
  inkGlow: Pair<Color>
  /** The shader's own tuning (0–1 floats): led, track base, lens body, reflection. */
  gl: { led: Pair<Color>; track: Pair<Color>; body: Pair<Color>; reflection: Pair<Color> }
}

export const APP_GLASS: GlassPalette = {
  led: [[111, 134, 255], [255, 168, 46]],
  track: [[[6, 6, 8], [12, 12, 15], [10, 10, 12]], [[200, 200, 196], [221, 221, 217], [230, 230, 226]]],
  face: [[[65, 65, 70], [40, 42, 49], [27, 29, 40]], [[255, 254, 249], [249, 248, 242], [238, 237, 232]]],
  edge: [[[207, 214, 233], [120, 129, 169], [137, 159, 255]], [[255, 255, 253], [255, 251, 237], [255, 250, 218]]],
  ink: [[255, 247, 228], [49, 45, 36]],
  inkGlow: [[255, 203, 149], [125, 97, 55]],
  gl: {
    led: [[0.36, 0.48, 1.0], [1.0, 0.57, 0.13]],
    track: [[0.041, 0.043, 0.054], [0.889, 0.886, 0.867]],
    body: [[0.20, 0.21, 0.24], [1.0, 0.994, 0.968]],
    reflection: [[0.60, 0.66, 0.81], [1.0, 0.99, 0.94]],
  },
}
