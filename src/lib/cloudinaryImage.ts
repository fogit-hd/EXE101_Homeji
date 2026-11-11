const HOMEJI_UPLOAD_PREFIX = '/dv4y7cdpi/image/upload/'

/** Widths requested for listing thumbnails; Cloudinary caches each derived size once. */
export const LISTING_THUMB_WIDTHS = [240, 480, 800] as const

/**
 * Returns a Cloudinary URL scaled down to `width` (never up), or null when the URL is not a Homeji
 * Cloudinary upload. Existing transformations in the URL are kept and run after the resize.
 */
export function cloudinaryResized(url: string, width: number): string | null {
  if (!Number.isInteger(width) || width <= 0) return null
  let parsed: URL
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' || !parsed.pathname.startsWith(HOMEJI_UPLOAD_PREFIX)) return null
  parsed.pathname = `${HOMEJI_UPLOAD_PREFIX}c_limit,w_${width}/${parsed.pathname.slice(HOMEJI_UPLOAD_PREFIX.length)}`
  return parsed.href
}

/** `srcSet` for a listing thumbnail, or undefined so the browser falls back to `src` for other hosts. */
export function listingThumbSrcSet(url: string): string | undefined {
  const entries = LISTING_THUMB_WIDTHS.map(width => {
    const resized = cloudinaryResized(url, width)
    return resized ? `${resized} ${width}w` : null
  })
  return entries.every(Boolean) ? entries.join(', ') : undefined
}
