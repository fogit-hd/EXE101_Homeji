import { useEffect, useState, type RefObject } from 'react'
import { searchRentalPosts, type RentalPostSummary } from '../../../api'
import {
  rentalSourceImageHref,
  rentalSourceLabel,
  searchRentalSources,
  sourceRoomHref,
  type RentalSourceListing,
} from '../../../api/rentalSources'
import { cloudinaryResized } from '../../../lib/cloudinaryImage'
import { LISTINGS, type Listing, type ListingTag } from '../../../lib/mock/homeji'

const FALLBACK_ROOM_IMAGE = '/landing/listings/balcony-640.webp'
const FALLBACK_SOURCE_IMAGE = '/landing/listings/loft-studio-640.webp'

function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

export function inferDistrictLabel(address: string, rawDistrict?: string | null): string {
  const haystack = stripDiacritics(`${rawDistrict ?? ''} ${address}`)
  if (/\b(quan\s*9|q\.?\s*9)\b/.test(haystack)) return 'Quận 9 (cũ)'
  if (/thu\s*duc/.test(haystack)) return 'TP. Thủ Đức'
  if (/binh\s*thanh/.test(haystack)) return 'Bình Thạnh'
  if (/go\s*vap/.test(haystack)) return 'Gò Vấp'
  if (/\b(quan\s*7|q\.?\s*7)\b/.test(haystack)) return 'Quận 7'
  return rawDistrict?.trim() || 'TP. Hồ Chí Minh'
}

function buildListingImage(url: string | null, fallbackSrc: string, alt: string) {
  if (!url) {
    return {
      src: fallbackSrc,
      srcSmall: fallbackSrc,
      width: 1280,
      height: 960,
      alt,
    }
  }
  const small = cloudinaryResized(url, 480) ?? url
  const large = cloudinaryResized(url, 800) ?? url
  return {
    src: large,
    srcSmall: small,
    width: 800,
    height: 600,
    alt,
  }
}

function fromNativePost(post: RentalPostSummary): Listing | null {
  if (post.isSynthetic === true) return null
  const kind = post.type === 2 ? 'roommate' : 'room'
  const tags: ListingTag[] = []
  if (post.isOwnerVerified === true) tags.push('verified')
  tags.push(kind === 'roommate' ? 'roommate' : 'available')

  const rawThumb = post.thumbnailPath?.trim() || null
  const safeThumb = rawThumb && /^https:\/\//i.test(rawThumb) ? rawThumb : null

  return {
    id: post.id,
    kind,
    title: post.title,
    price: Number.isFinite(post.price) && post.price > 0 ? post.price : 0,
    area: Number.isFinite(post.area) && post.area > 0 ? post.area : 0,
    address: post.address,
    district: inferDistrictLabel(post.address),
    tags,
    image: buildListingImage(safeThumb, FALLBACK_ROOM_IMAGE, post.title),
    owner: {
      name: post.ownerDisplayName?.trim() || 'Chủ nhà Homeji',
      role: kind === 'roommate' ? 'Người tìm ở ghép' : 'Chủ trọ',
    },
    href: `/posts/${encodeURIComponent(post.id)}`,
    coords: Number.isFinite(post.latitude) && Number.isFinite(post.longitude) && post.latitude !== 0 && post.longitude !== 0
      ? { lat: post.latitude, lng: post.longitude }
      : undefined,
  }
}

function fromSourceListing(source: RentalSourceListing, nativeIds: Set<string>): Listing | null {
  if (nativeIds.has(source.id)) return null
  if (source.sourceExpiresAt) {
    const expiresAt = Date.parse(source.sourceExpiresAt)
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return null
  }

  const kind = /ở ghép|tìm bạn ở ghép|o ghep/i.test(source.title) ? 'roommate' : 'room'
  const tags: ListingTag[] = kind === 'roommate' ? ['roommate', 'available'] : ['available']
  const firstImage = source.imageUrls?.map(rentalSourceImageHref).find(Boolean) ?? null

  return {
    id: source.id,
    kind,
    title: source.title,
    price: Number.isFinite(source.price) && source.price > 0 ? source.price : 0,
    area: Number.isFinite(source.area) && source.area > 0 ? source.area : 0,
    address: source.address,
    district: inferDistrictLabel(source.address, source.district),
    tags,
    image: buildListingImage(firstImage, FALLBACK_SOURCE_IMAGE, source.title),
    owner: {
      name: source.publisherName?.trim() || rentalSourceLabel(source.source),
      role: kind === 'roommate' ? 'Người tìm ở ghép' : 'Chủ trọ',
    },
    href: sourceRoomHref(source.id, { search: '', hash: '#tin-noi-bat' }),
  }
}

export function useLandingListings(sectionRef: RefObject<HTMLElement | null>, eager: boolean) {
  const [listings, setListings] = useState<Listing[]>(LISTINGS)
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nearViewport, setNearViewport] = useState(false)
  const shouldFetch = eager || nearViewport

  useEffect(() => {
    if (shouldFetch) return
    const node = sectionRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setNearViewport(true))
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [sectionRef, shouldFetch])

  useEffect(() => {
    if (!shouldFetch) return
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true)
    })

    void (async () => {
      try {
        const [postsResult, sourcesResult] = await Promise.allSettled([
          searchRentalPosts({ page: 1, pageSize: 16 }, { auth: false, signal: controller.signal }),
          searchRentalSources({ keyword: '', district: '', page: 1, pageSize: 16 }, controller.signal),
        ])

        if (controller.signal.aborted) return

        const posts = postsResult.status === 'fulfilled' && Array.isArray(postsResult.value)
          ? postsResult.value
          : []
        const sources = sourcesResult.status === 'fulfilled' && Array.isArray(sourcesResult.value)
          ? sourcesResult.value
          : []

        const nativeIds = new Set(posts.filter(p => p.isSynthetic !== true).map(p => p.id))
        const mappedNative = posts.map(fromNativePost).filter((item): item is Listing => item !== null)
        const mappedSources = sources
          .map(source => fromSourceListing(source, nativeIds))
          .filter((item): item is Listing => item !== null)

        const merged = [...mappedNative, ...mappedSources].slice(0, 16)
        if (merged.length > 0) {
          setListings(merged)
          setIsLive(true)
        }
      } catch {
        // Keep fallback LISTINGS when API is unreachable
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [shouldFetch])

  return { listings, isLive, loading }
}
