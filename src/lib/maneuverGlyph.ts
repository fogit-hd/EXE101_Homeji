/**
 * Arrow for a Routes / Directions maneuver code, e.g. TURN_LEFT, uturn-right.
 * Only real U-turns get the U-turn arrow; ordinary turns contain "TURN" too.
 */
export function maneuverGlyph(maneuver: string | null | undefined): string {
  const key = (maneuver || '').toUpperCase().replace(/[-\s]/g, '_')
  if (key.includes('UTURN') || key.includes('U_TURN')) return key.includes('RIGHT') ? '↷' : '↶'
  if (key.includes('ROUNDABOUT') || key.includes('FORK')) return '↻'
  if (key.includes('LEFT')) return '↰'
  if (key.includes('RIGHT')) return '↱'
  if (key.includes('MERGE')) return '⤴'
  if (key.includes('STRAIGHT') || key.includes('CONTINUE') || key.includes('NAME_CHANGE')) return '↑'
  if (key.includes('DEPART') || key.includes('FERRY')) return '●'
  if (key.includes('ARRIVE')) return '◎'
  return '→'
}
