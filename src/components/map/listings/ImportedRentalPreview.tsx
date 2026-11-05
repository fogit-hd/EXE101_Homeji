import { useEffect, useState } from 'react'
import { getRentalPost, type RentalPost } from '../../../api'
import { useRentalPostSave } from '../../../hooks/useRentalPostSave'
import type { SourceCatalogPin } from '../../../lib/sourceCatalog'
import { sourcePublisherLink } from '../../../lib/sourcePublisherLinks'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import { mapBackendListingToListingViewModel } from './listingAdapters'
import { RentalMapPreview } from './RentalMapPreview'

export function ImportedRentalPreview({ pin, onClose, onOpen }: { pin: SourceCatalogPin; onClose: () => void; onOpen: () => void }) {
  const id = sourcePublisherLink(pin.id.slice('rental:'.length))?.nativePostId
  const [post, setPost] = useState<RentalPost | null>(null)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    void getRentalPost(id, { auth: false, signal: controller.signal }).then(row => {
      if (!controller.signal.aborted && row.id === id) setPost(row)
    }).catch(() => { /* The real source summary remains available while detail can retry. */ })
    return () => controller.abort()
  }, [id])
  if (id) return <NativePreview key={id} id={id} post={post?.id === id ? post : null} pin={pin} onClose={onClose} onOpen={onOpen} />
  return <RentalMapPreview monthly onClose={onClose} onOpen={onOpen} view={sourceView(pin)} />
}

function sourceView(pin: SourceCatalogPin) {
  return { id: pin.id, title: pin.title, address: pin.address,
    priceLabel: pin.price === null ? 'Trao đổi' : `${pin.price.toLocaleString('vi-VN')} ₫`,
    areaLabel: pin.area === null ? '' : `${pin.area} m²`, thumbnailUrl: pin.imageUrl,
    latitude: pin.lat, longitude: pin.lng, typeLabel: isApartmentListing(pin.title) ? 'Căn hộ' : 'Phòng trọ',
    highlightTag: null, ownerBadge: null, isPremium: false, isOwnerVerified: false,
    facts: pin.amenityHighlights, updatedAt: pin.sourceUpdatedAt }
}

function NativePreview({ id, post, pin, onClose, onOpen }: { id: string; post: RentalPost | null; pin: SourceCatalogPin; onClose: () => void; onOpen: () => void }) {
  const save = useRentalPostSave(id)
  return <RentalMapPreview monthly view={post ? mapBackendListingToListingViewModel(post) : sourceView(pin)}
      onClose={onClose} onOpen={onOpen} saved={save.saved} saveBusy={save.busy}
      onToggleSave={() => { void save.toggle() }} notice={save.error} considerationPost={{ id, title: post?.title ?? pin.title }} />
}
