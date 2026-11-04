import type { SourceCatalogPin } from '../../lib/sourceCatalog'
import { formatPrice } from '../../lib/labels'
import { sourceRoomHref } from '../../lib/sourceRoomLink'

export function createSourceCatalogPopup(pin: SourceCatalogPin, onOpen: (id: string) => void): HTMLDivElement {
  const root = document.createElement('div'); root.className = `source-catalog-popup source-catalog-popup--${pin.kind}`
  let rentalImage: HTMLImageElement | null = null
  if (pin.imageUrl) {
    const image = document.createElement('img'); image.src = pin.imageUrl; image.alt = pin.kind === 'rental' ? pin.title : ''; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'
    image.addEventListener('error', () => image.remove(), { once: true })
    if (pin.kind === 'rental') { image.className = 'source-catalog-popup__image'; rentalImage = image }
    else root.append(image)
  }
  if (pin.kind === 'food') {
    const title = document.createElement('strong'); title.textContent = pin.title
    const address = document.createElement('p'); address.textContent = pin.address
    root.append(title, address)
    const note = document.createElement('small'); note.textContent = 'Xem thông tin quán trước khi ghé.'
    const link = document.createElement('a'); link.href = pin.sourceUrl; link.textContent = 'Xem thông tin quán'; link.target = '_blank'; link.rel = 'noopener noreferrer'
    root.append(note, link); return root
  }

  const summary = document.createElement('div'); summary.className = 'source-catalog-popup__summary'
  if (rentalImage) summary.append(rentalImage)
  const intro = document.createElement('div'); intro.className = 'source-catalog-popup__intro'
  const eyebrow = document.createElement('span'); eyebrow.className = 'source-catalog-popup__eyebrow'; eyebrow.textContent = 'PHÒNG TRONG KHU VỰC'
  const title = document.createElement('strong'); title.className = 'source-catalog-popup__title'; title.textContent = pin.title
  intro.append(eyebrow, title)
  if (pin.price !== null) {
    const price = document.createElement('p'); price.className = 'source-catalog-popup__price'
    const amount = document.createElement('strong'); amount.textContent = formatPrice(pin.price)
    const period = document.createElement('small'); period.textContent = '/ tháng'
    price.append(amount, period); intro.append(price)
  }
  const address = document.createElement('p'); address.className = 'source-catalog-popup__address'; address.textContent = pin.address; intro.append(address)
  summary.append(intro); root.append(summary)

  const body = document.createElement('div'); body.className = 'source-catalog-popup__body'
  const facts = [pin.area !== null ? `${pin.area} m²` : null, pin.depositLabel, ...pin.amenityHighlights].filter((value): value is string => Boolean(value))
  if (facts.length) {
    const list = document.createElement('div'); list.className = 'source-catalog-popup__facts'
    for (const fact of facts) { const tag = document.createElement('span'); tag.textContent = fact; list.append(tag) }
    body.append(list)
  }
  if (pin.sourceUpdatedAt) {
    const updated = document.createElement('small'); updated.className = 'source-catalog-popup__updated'
    updated.textContent = `Tin đăng cập nhật ${new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(pin.sourceUpdatedAt))}`
    body.append(updated)
  }
  const author = document.createElement('p'); author.className = 'source-catalog-popup__publisher'; author.textContent = 'Tin từ nguồn công khai'; body.append(author)
  const note = document.createElement('small'); note.className = 'source-catalog-popup__note'; note.textContent = 'Kiểm tra chi tiết phòng và đăng nhập để liên hệ.'; body.append(note)
  root.append(body)
  const id = pin.id.slice('rental:'.length)
  const link = document.createElement('a'); link.href = sourceRoomHref(id); link.className = 'source-catalog-popup__action'; link.textContent = 'Xem phòng & liên hệ'
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault(); event.stopPropagation(); onOpen(id)
  }); root.append(link)
  return root
}

