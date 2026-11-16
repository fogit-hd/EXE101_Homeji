import type { GlassPalette } from '../../../components/theme/glassPalette'

/**
 * The app's theme switch (components/theme/ThemeSwitch) in the landing's colours (tokens.css):
 * by day a cream track (--hx-surface-sunken) lit in the landing's orange (--hx-orange-500), the sun
 * drawn in the logo's green (--hx-logo-ink); by night a warm dark track (--hx-bg) lit by the logo's
 * sage (#b9d3a8) instead of the app's blue.
 */
export const LANDING_GLASS: GlassPalette = {
  led: [[185, 211, 168], [249, 128, 34]],
  track: [[[10, 8, 6], [22, 18, 14], [19, 15, 11]], [[219, 207, 188], [233, 223, 208], [240, 232, 220]]],
  face: [[[64, 55, 46], [43, 36, 29], [31, 25, 19]], [[255, 252, 245], [251, 246, 237], [240, 232, 219]]],
  edge: [[[226, 236, 216], [140, 162, 124], [185, 211, 168]], [[255, 255, 250], [255, 247, 232], [255, 236, 206]]],
  ink: [[250, 246, 232], [53, 77, 43]],
  inkGlow: [[196, 226, 176], [150, 102, 50]],
  gl: {
    led: [[0.72, 0.83, 0.64], [0.98, 0.50, 0.12]],
    track: [[0.066, 0.053, 0.041], [0.918, 0.880, 0.822]],
    body: [[0.23, 0.195, 0.16], [1.0, 0.985, 0.955]],
    reflection: [[0.74, 0.81, 0.68], [1.0, 0.98, 0.93]],
  },
}
