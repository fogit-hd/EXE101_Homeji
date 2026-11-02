/** Source details are public records; they do not require a Homeji owner account. */
export function sourceRoomHref(id: string, current = typeof location === 'undefined' ? { search: '', hash: '' } : location) {
  const params = new URLSearchParams(current.search)
  params.set('source', id)
  return `/?${params}${current.hash}`
}
