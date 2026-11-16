/**
 * The page's scroll position, read once per screen frame. Reading window.scrollY makes the browser
 * bring style and layout up to date on the spot; the navbar and the film each read it every frame, and
 * a read after the film has written its styles meant a second full restyle in the same frame. The first
 * reader in a frame (the film reads before it writes) pays; the rest get the same number.
 */
let y = 0
let at: number | null = null

export function frameScrollY() {
  const now = document.timeline.currentTime as number | null
  if (now === null || now !== at) {
    y = window.scrollY
    at = now
  }
  return y
}
