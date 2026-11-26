/** A deliberate swipe changes snap point; short drags return to the current point. */
export function sheetShouldExpand(expanded: boolean, deltaY: number): boolean {
  return Math.abs(deltaY) < 48 ? expanded : deltaY < 0
}

/** Keep the preview inside the map, above the pin when there is room. */
export function previewPlacement(x: number, y: number, width: number, height: number, cardWidth: number, cardHeight: number) {
  const inset = 8
  const left = Math.max(inset, Math.min(x - cardWidth / 2, width - cardWidth - 64))
  const above = y - cardHeight - 24
  const top = Math.max(inset, Math.min(above >= inset ? above : y + 24, height - cardHeight - 32))
  return { left, top, below: above < inset }
}
