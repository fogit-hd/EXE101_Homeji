/** Run through the supported Cua tab API against a rendered, authenticated page. */
export async function assertHeaderLayout(tab) {
  const geometry = await tab.playwright.evaluate(() => {
    const selectors = ['.hj-header__menu', '.hj-logo', '.hj-search__field', '.hj-search-open', '.hj-actions']
    const boxes = selectors.flatMap(selector => {
      const element = document.querySelector(selector)
      if (!element) return []
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || !rect.width || !rect.height) return []
      return [{ selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }]
    })
    const overlaps = []
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const first = boxes[i], second = boxes[j]
        if (Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
          && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1) {
          overlaps.push([first.selector, second.selector])
        }
      }
    }
    return {
      viewport: innerWidth, boxes, overlaps,
      overflow: boxes.filter(box => box.left < -1 || box.right > innerWidth + 1).map(box => box.selector),
    }
  })
  if (geometry.boxes.length < 3) throw new Error('Expected a rendered authenticated header')
  if (geometry.overlaps.length || geometry.overflow.length) {
    throw new Error(`Header collision: ${JSON.stringify(geometry)}`)
  }
  return geometry
}
