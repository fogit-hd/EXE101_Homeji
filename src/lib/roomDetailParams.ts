/** Room navigation preserves filters and legacy post/source links. */
export function roomDetailParams(previous: URLSearchParams, id: string | null): URLSearchParams {
  const next = new URLSearchParams(previous)
  if (id) next.set('room', id)
  else next.delete('room')
  return next
}
