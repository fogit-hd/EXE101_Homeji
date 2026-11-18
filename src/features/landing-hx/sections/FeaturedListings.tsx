import { useMemo, useRef, type Ref } from 'react'
import { SearchX, X } from 'lucide-react'
import { DISTRICT_OPTIONS, LISTINGS, PRICE_OPTIONS, type Listing } from '../../../lib/mock/homeji'
import { filterListings } from './filterListings'
import { RevealGroup, RevealItem } from '../motion/Reveal'
import { useDistortionWave } from '../motion/useDistortionWave'
import { Button, ButtonLink } from '../ui/Button'
import { Container, SectionHeading } from '../ui/primitives'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ListingCard } from './ListingCard'
import type { ListingQuery } from './SearchBar'

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'room', label: 'Thuê phòng' },
  { value: 'roommate', label: 'Ở ghép' },
] as const

const PANEL_ID = 'hx-listings-panel'

export function FeaturedListings({
  listings = LISTINGS,
  sectionRef,
  query,
  onQueryChange,
  highlightId = null,
}: {
  listings?: Listing[]
  sectionRef?: Ref<HTMLElement>
  query: ListingQuery
  onQueryChange: (query: ListingQuery) => void
  /** Card the hero just pointed at; outlined briefly. */
  highlightId?: string | null
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { wave, warmup } = useDistortionWave()
  const results = useMemo(() => filterListings(listings, query), [listings, query])
  const districtLabel = DISTRICT_OPTIONS.find(option => option.value === query.district)?.label
  const priceLabel = PRICE_OPTIONS.find(option => option.value === query.price)?.label
  const narrowed = Boolean(query.district || query.price)
  const clearFilters = () => onQueryChange({ ...query, district: '', price: '' })

  return (
    <section ref={sectionRef} id="tin-noi-bat" className="hx-section hx-listings" aria-labelledby="hx-listings-title">
      <Container>
        <SectionHeading
          id="hx-listings-title"
          title="Phòng nổi bật quanh bạn"
          lead="Tin mới ở Thủ Đức, Bình Thạnh, Gò Vấp, Quận 7 và quanh các trường đại học."
          action={(
            <SegmentedControl
              mode="tabs"
              label="Lọc theo loại tin"
              options={TABS}
              value={query.kind}
              onWarmup={warmup}
              onChange={(kind, event) => {
                if (kind === query.kind) return
                const focus = event && 'clientX' in event ? event.nativeEvent : null
                void wave(panelRef.current, () => onQueryChange({ ...query, kind }), {
                  source: event?.currentTarget,
                  focus,
                })
              }}
              tabId={value => `hx-tab-${value}`}
              panelId={() => PANEL_ID}
            />
          )}
        />

        {narrowed ? (
          <div className="hx-listings__filters">
            <span>Đang lọc:</span>
            {districtLabel && query.district ? <span className="hx-listings__chip">{districtLabel}</span> : null}
            {priceLabel && query.price ? <span className="hx-listings__chip">{priceLabel}</span> : null}
            <Button variant="ghost" size="sm" icon={<X aria-hidden="true" />} onClick={clearFilters}>Xóa bộ lọc</Button>
          </div>
        ) : null}

        <div
          ref={panelRef}
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={`hx-tab-${query.kind}`}
          aria-live="polite"
          className="hx-listings__panel"
        >
          {results.length > 0 ? (
            <RevealGroup key={`${query.kind}-${query.district}-${query.price}`} as="ul" className="hx-listings__grid">
              {results.map(listing => (
                <RevealItem as="li" key={listing.id}>
                  <ListingCard listing={listing} highlighted={listing.id === highlightId} />
                </RevealItem>
              ))}
            </RevealGroup>
          ) : (
            <div className="hx-listings__empty">
              <SearchX aria-hidden="true" />
              <p className="hx-listings__empty-title">Chưa có tin khớp bộ lọc này</p>
              <p>Thử bỏ bớt khu vực hoặc mở rộng khoảng giá.</p>
              <Button variant="outline" onClick={clearFilters}>Xóa bộ lọc</Button>
            </div>
          )}
        </div>

        <div className="hx-listings__more">
          <ButtonLink to="/register" variant="outline" size="lg">Đăng ký miễn phí để xem tất cả tin</ButtonLink>
        </div>
      </Container>
    </section>
  )
}
