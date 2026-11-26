import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getRentalSourceCatalog, sourceRoomHref, rentalSourceImageHref, type RentalSourceListing } from '../../../api/rentalSources'
import { getErrorMessage } from '../../../lib/errors'
import { formatCompactRent, formatListingArea } from '../../../lib/labels'
import { shortListingAddress } from '../../MapListingCard.logic'
import { filterRentalSourcesForList, sourceHasLocation, sourceHasUnsupportedFilters } from '../../../lib/rentalSourceFilters'
import { HouseIcon, SparkleIcon, NoteEditIcon, UsersIcon } from '../../icons/SvgIcons'
import { Sk, SkCard } from '../../skeletons/Skeleton'
import { ShowMore, SHOW_MORE_STEP } from '../../ui/Disclosure'
import type { ListingQuery } from './listingAdapters'
import './RentalSourceResults.css'
import { useCatalogRefresh } from '../../../lib/useCatalogRefresh'
import { MobileRoomCard } from '../../../mobile/listings/MobileRoomCard'
import { sortListings, type ListingSort, type SortFacts } from './listingSort'

type Counts = { total: number; mapped: number }
export function RentalSourceResults({ query, onCount, onFocus, onResetFilters, nativeCards = [], nativeIds = [], nativeFacts = [], sort = 'default', selectedId, onHover, onLeave, mobile = false }: {
  /** Price and area of each native card, in nativeCards order, so a sort can merge both inventories. */
  nativeFacts?: SortFacts[]
  sort?: ListingSort
  /** Phone layout: compact horizontal cards. */
  mobile?: boolean
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
  // Homeji posts come first; rooms gathered from other sites follow in their own
  // group, so the two card types (and their different actions) never alternate.
  // A chosen sort orders each group on its own.
  type Item = { key: string; native?: ReactNode; row?: RentalSourceListing; facts?: SortFacts }
  const nativeItems: Item[] = nativeCards.map((native, index) => ({ key: `native-${index}`, native, facts: nativeFacts[index] }))
  const sourceItems: Item[] = filtered.map(row => ({ key: row.id, row }))
  const combined: Item[] = [
    ...sortListings(nativeItems, sort, item => item.facts ?? {}),
    ...sortListings(sourceItems, sort, item => item.row ?? {}),
  ]
  const selectedIndex = combined.findIndex(item => item.row ? `rental:${item.row.id}` === selectedId : nativeIds[Number(item.key.slice(7))] === selectedId)
  const visibleCount = Math.max(visible, selectedIndex + 1)
  const shown = combined.slice(0, visibleCount)
  const shownNative = shown.filter(item => !item.row)
  const shownSource = shown.filter(item => item.row)
  return <section className="source-results" aria-label="Danh sách phòng">
    {!loaded && !error ? (
      <>
        <p className="source-results__note" role="status">Đang tải danh sách…</p>
        {combined.length === 0 ? (
          <ul className="map-listings__cards sk-screen" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <SkCard className="sk-listing-card sk-source-card" style={{ width: '100%' }}>
                  <Sk w={104} h={mobile ? 104 : 84} r={10} className="sk-listing-card__thumb" />
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
    {shownNative.length > 0 ? <ul className="map-listings__cards">{shownNative.map(item => <li key={item.key}>{item.native}</li>)}</ul> : null}
    {shownSource.length > 0 ? <h3 className="source-results__group-title">Tin từ nguồn khác <span>{filtered.length}</span></h3> : null}
    {shownSource.length > 0 ? <ul className="map-listings__cards">{shownSource.map(item => {
      const row = item.row!
      const photo = row.imageUrls.map(rentalSourceImageHref).find(Boolean)
      if (mobile) return <li key={row.id}><MobileRoomCard id={`rental:${row.id}`} photo={photo} cloudinary={false} referrerPolicy="no-referrer"
        to={sourceRoomHref(row.id)} selected={selectedId === `rental:${row.id}`} title={row.title}
        meta={[Number.isFinite(row.area) && row.area > 0 ? formatListingArea(row.area) : '', shortListingAddress((row.address || '').trim())].filter(Boolean).join(' · ')}
        price={<>{formatCompactRent(row.price)}{Number.isFinite(row.price) && row.price > 0 ? '/tháng' : ''}</>}
        actions={onFocus && sourceHasLocation(row) ? <button type="button" onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
          Xem trên bản đồ
        </button> : undefined} /></li>
      return <li key={row.id}><article data-listing-id={`rental:${row.id}`} className={`map-listings__card source-results__card${selectedId === `rental:${row.id}` ? ' is-selected' : ''}`} onMouseEnter={() => onHover?.(`rental:${row.id}`)} onMouseLeave={onLeave} onFocus={() => onHover?.(`rental:${row.id}`)} onBlur={onLeave}>
        <Link className="source-results__photo" to={sourceRoomHref(row.id)} aria-label={`Xem phòng: ${row.title}`}>
          <span className="source-results__empty-photo">Chưa có ảnh</span>
          {photo ? <img decoding="async" width={640} height={400} src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /> : null}
        </Link>
        <div className="source-results__copy">
          <strong className="map-listings__price source-results__price">{formatCompactRent(row.price)}{Number.isFinite(row.price) && row.price > 0 ? '/tháng' : ''}</strong>
          <h3 className="map-listings__name"><Link className="source-results__stretch" to={sourceRoomHref(row.id)}>{row.title}</Link></h3>
          <p className="source-results__meta">{[Number.isFinite(row.area) && row.area > 0 ? formatListingArea(row.area) : '', shortListingAddress((row.address || '').trim())].filter(Boolean).join(' · ')}</p>
        </div>
        {onFocus && sourceHasLocation(row) ? <div className="source-results__actions">
          <button type="button" className="source-results__locate" data-glass-exclude onClick={() => onFocus({ lat: row.latitude!, lng: row.longitude! })}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>
            Xem trên bản đồ
          </button>
        </div> : null}
      </article></li>
    })}</ul> : null}
    <ShowMore className="source-results__more" shown={Math.min(visibleCount, combined.length)} total={combined.length} unit="tin" onMore={() => setVisible(visibleCount + SHOW_MORE_STEP)} />
  </section>
}
