/**
 * One-line handwritten strokes for "Welcome to Homeji".
 * Each glyph is drawn as continuous SVG path(s) — animated via stroke-dashoffset.
 */

export type HandGlyph = {
  d: string
  advance: number
}

/**
 * Script / single-pen glyphs (viewBox units).
 * Prefer one continuous `d` so the dash offset reads as handwriting.
 */
export const HAND_GLYPHS: Record<string, HandGlyph> = {
  W: {
    d: 'M 2 12 C 4 12 6 44 8 50 C 10 44 13 18 16 16 C 18 18 21 44 24 50 C 26 44 30 12 34 10',
    advance: 38,
  },
  e: {
    d: 'M 24 34 C 22 22 4 20 4 34 C 4 46 18 50 26 40 C 20 36 12 34 4 34',
    advance: 30,
  },
  l: {
    d: 'M 6 54 C 6 54 7 8 9 4 C 12 1 16 8 14 30 C 12 46 10 54 20 54',
    advance: 24,
  },
  c: {
    d: 'M 26 26 C 20 18 3 20 3 36 C 3 48 16 52 26 44',
    advance: 30,
  },
  o: {
    d: 'M 16 22 C 5 22 2 30 2 37 C 2 48 10 52 17 52 C 28 52 32 44 32 37 C 32 26 25 22 16 22',
    advance: 36,
  },
  m: {
    d: 'M 2 52 L 2 30 C 2 22 7 20 12 28 C 14 20 20 20 24 28 C 26 20 33 22 34 30 L 34 52',
    advance: 40,
  },
  t: {
    // one continuous stroke: bar → stem
    d: 'M 2 20 L 22 20 L 12 20 L 12 6 L 12 48 C 12 56 24 56 24 46',
    advance: 28,
  },
  H: {
    // One-stroke H rõ ràng (2 stem + gạch ngang) — tránh bị đọc thành M
    d: 'M 4 52 L 4 8 L 4 30 L 30 30 L 30 8 L 30 52',
    advance: 38,
  },
  j: {
    d: 'M 16 12 C 16 6 10 6 10 12 C 10 16 16 16 16 12 L 16 20 L 16 48 C 16 60 0 60 2 50',
    advance: 24,
  },
  i: {
    // stem then hop to dot (short lift inside path order)
    d: 'M 8 22 L 8 52 M 8 8 C 8 4 14 4 14 8 C 14 12 8 12 8 8',
    advance: 20,
  },
  ' ': {
    d: '',
    advance: 18,
  },
}

export const WELCOME_PHRASE = 'Welcome to Homeji'

export type LaidOutStroke = {
  d: string
  x: number
  char: string
  index: number
}

export function layoutWelcomeStrokes(
  phrase: string = WELCOME_PHRASE,
  startX = 6,
): { strokes: LaidOutStroke[]; width: number; height: number } {
  const strokes: LaidOutStroke[] = []
  let x = startX
  let i = 0
  for (const char of phrase) {
    const glyph =
      HAND_GLYPHS[char] ?? HAND_GLYPHS[char.toUpperCase()] ?? HAND_GLYPHS[char.toLowerCase()]
    if (!glyph) {
      x += 16
      continue
    }
    if (glyph.d) {
      strokes.push({ d: glyph.d, x, char, index: i })
      i += 1
    }
    x += glyph.advance
  }
  return { strokes, width: x + 10, height: 68 }
}
