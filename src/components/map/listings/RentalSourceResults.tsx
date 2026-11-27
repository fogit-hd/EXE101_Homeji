import { readSourceCatalogPins, type SourceCatalogPin } from '../../../lib/sourceCatalog'
import { RentalResultCard } from './RentalResultCard'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRentalSourceCatalog, rentalSourcePublisher, sourceRoomHref, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { formatPrice } from '../../../lib/labels'
import { isApartmentListing } from '../../../lib/rentalPropertyCategory'
import { filterRentalSourcesForList, sourceHasLocation, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import { HouseIcon, SparkleIcon, NoteEditIcon, UsersIcon } from '../../icons/SvgIcons'
import { Sk, SkCard } from '../../skeletons/Skeleton'
import { ShowMore, SHOW_MORE_STEP } from '../../ui/Disclosure'
import type { ListingQuery } from './listingAdapters'
import './RentalSourceResults.css'
import { useCatalogRefresh } from '../../../lib/useCatalogRefresh'
import { sortListings, type ListingSort, type SortFacts } from './listingSort'

type Counts = { total: number; mapped: number }
function formatSourceDate(value: string | null | undefined): string | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(timestamp)
    : null
}

export function RentalSourceResults({ onSelectSource, query, onCount, onFocus, onResetFilters, nativeCards = [], nativeIds = [], nativeFacts = [], sort = 'default', selectedId, onHover, onLeave }: {
  /** Price and area of each native card, in nativeCards order, so a sort can merge both inventories. */
  onSelectSource?: (pin: SourceCatalogPin) => void
  nativeFacts?: SortFacts[]
  sort?: ListingSort
  selectedId?: string | null
  onHover?: (id: string) => void
  onLeave?: () => void
  nativeIds?: string[]
  nativeCards?: ReactNode[]
  query: ListingQuery
  onCount: (count: Counts) => void
  onFocus?: (location: { lat: number; lng: number }) => void
  onResetFilters?: () => void
}) {
  const [rows, setRows] = useState<RentalSourceListing[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [visible, setVisible] = useState(20)
  const revision = useCatalogRefresh()
  useEffect(() => {
    let active = true
    void getRentalSourceCatalog().then(result => { if (active) { setRows(result); setLoaded(true); setError('') } })
      .catch(reason => { if (active) { setLoaded(true); setError(getErrorMessage(reason, 'Chưa tải được danh sách phòng.')) } })
    return () => { active = false }
  }, [attempt, revision])
  const nativeIdKey = [...nativeIds].sort().join('|')
  const filtered = useMemo(() => {
    const visibleNativeIds = new Set(nativeIdKey.split('|'))
    return filterRentalSourcesForList(rows, query).filter(row => !visibleNativeIds.has(row.id))
  }, [rows, query, nativeIdKey])
  const counts = useMemo(() => ({ total: filtered.length, mapped: filtered.filter(sourceHasLocation).length }), [filtered])
  useEffect(() => { onCount(counts) }, [onCount, counts])
  const unsupported = sourceHasUnsupportedFilters(query)
  type Item = { key: string; native?: ReactNode; row?: RentalSourceListing; facts?: SortFacts }
  const nativeItems: Item[] = nativeCards.map((native, index) => ({ key: `native-${index}`, native, facts: nativeFacts[index] }))
  const sourceItems: Item[] = filtered.map(row => ({ key: row.id, row }))
  const combined: Item[] = []
  for (let index = 0; index < Math.max(nativeItems.length, sourceItems.length); index++) {
    if (nativeItems[index]) combined.push(nativeItems[index])
    if (sourceItems[index]) combined.push(sourceItems[index])
  }
  const ordered = sortListings(combined, sort, item => item.row ?? item.facts ?? {})
  const selectedIndex = ordered.findIndex(item => item.row ? `rental:${item.row.id}` === selectedId : nativeIds[Number(item.key.slice(7))] === selectedId)
  const visibleCount = Math.max(visible, selectedIndex + 1)
  return <section className="source-results" aria-label="Danh sách phòng">
    {!loaded && !error ? (
      <>
        <p className="source-results__note" role="status">Đang tải danh sách…</p>
        {combined.length === 0 ? (
          <ul className="map-listings__cards sk-screen" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <SkCard className="sk-listing-card sk-source-card" style={{ width: '100%' }}>
                  <Sk w={104} h={84} r={10} className="sk-listing-card__thumb" />
                  <div className="sk-stack">
                    <Sk w="44%" h={14} />
                    <Sk w="86%" h={14} />
                    <Sk w="64%" h={11} />
                    <div className="sk-row">
                      <Sk w={58} h={20} r={999} />
                      <Sk w={64} h={20} r={999} />
                    </div>
                  </div>
                </SkCard>
              </li>
            ))}
          </ul>
        ) : null}
      </>
    ) : null}
    {unsupported ? <p className="source-results__note">Một số tin chưa đủ dữ liệu để đối chiếu bộ lọc tiện ích, số người hoặc danh sách AI đang chọn. Bỏ các điều kiện này để xem thêm.</p> : null}
    {error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></p> : null}
    {loaded && !error && combined.length === 0 ? (
      <div className="map-listings__smart-empty" role="status">
        <div className="map-listings__empty-icon" aria-hidden="true">
          <HouseIcon size={26} />
          <SparkleIcon size={18} />
        </div>
        <h3 className="map-listings__empty-title">Chưa tìm thấy phòng phù hợp với yêu cầu của bạn</h3>
        <p className="map-listings__empty-desc">
          Chưa có phòng phù hợp. Thử bỏ bớt bộ lọc hoặc đăng tin tìm phòng để các chủ trọ và bạn cùng phòng chủ động kết nối!
        </p>
        <div className="map-listings__empty-actions">
          {onResetFilters ? (
            <button type="button" className="btn-empty-reset" onClick={onResetFilters}>
              Đặt lại bộ lọc
            </button>
          ) : null}
          <Link to="/wanted" className="btn-empty-cta">
            <NoteEditIcon size={15} />
            <span>Đăng tin tìm phòng ngay</span>
          </Link>
          <Link to="/invitations" className="btn-empty-secondary">
            <UsersIcon size={15} />
            <span>Tìm bạn ở ghép</span>
          </Link>
        </div>
      </div>
    ) : null}
    <ul className="map-listings__cards">{ordered.slice(0, visibleCount).map(item => {
      if (!item.row) return <li key={item.key}>{item.native}</li>
      const row = item.row
      const photo = row.imageUrls.map(rentalSourceImageHref).find(Boolean)
      const sourcePin = onSelectSource ? readSourceCatalogPins([row], 'rental')[0] : undefined
      const updatedAt = formatSourceDate(row.sourceUpdatedAt)
      return <li key={row.id}><RentalResultCard id={`rental:${row.id}`} title={row.title} price={<>{formatPrice(row.price)} <small>/ tháng</small></>}
        area={row.area > 0 ? `${row.area} m²` : undefined} propertyType={isApartmentListing(row.title) ? 'Căn hộ' : 'Phòng trọ'} address={row.address}
        photo={photo} photoCount={row.imageUrls.length} imported amenities={row.amenityHighlights ?? []} selectedAmenities={query.amenities}
        deposit={row.depositLabel ?? undefined} updated={updatedAt} publisher={rentalSourcePublisher(row.publisherName)} href={sourceRoomHref(row.id)}
        onSelect={onSelectSource && sourcePin ? () => onSelectSource(sourcePin) : undefined}
        selected={selectedId === `rental:${row.id}`} onHover={() => onHover?.(`rental:${row.id}`)} onLeave={onLeave}
        secondaryAction={onFocus && sourceHasLocation(row) ? <button type="button" data-glass-exclude onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>Xem bản đồ</button> : undefined}
      /></li>
    })}</ul>
    <ShowMore className="source-results__more" shown={Math.min(visibleCount, combined.length)} total={combined.length} unit="tin" onMore={() => setVisible(visibleCount + SHOW_MORE_STEP)} />
  </section>
}
