import type { MouseEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BadgeCheck } from 'lucide-react'
import { HERO_SHOWCASE, LISTINGS, TRUST_STATS, type Listing } from '../../../lib/mock/homeji'
import { SearchBar, type ListingQuery } from './SearchBar'
import { formatMillions, listingCardId } from './format'

/*
 * Three photos on a 12×12 grid. Each tile gets one oversized corner, on a different
 * corner each time, so the set reads as arranged rather than templated.
 * The third tile overlaps the first and carries a ring in the page colour to separate them.
 */
const TILE_LAYOUT = [
  'tw:col-start-1 tw:col-span-7 tw:row-start-1 tw:row-span-10 tw:rounded-[22px] tw:rounded-tl-[72px] tw:lg:rounded-[28px] tw:lg:rounded-tl-[120px]',
  'tw:col-start-8 tw:col-span-5 tw:row-start-2 tw:row-span-5 tw:rounded-[20px] tw:rounded-tr-[56px] tw:lg:rounded-[24px] tw:lg:rounded-tr-[88px]',
  'tw:z-10 tw:col-start-6 tw:col-span-7 tw:row-start-7 tw:row-span-6 tw:rounded-[20px] tw:rounded-br-[64px] tw:ring-[5px] tw:ring-canvas tw:lg:rounded-[24px] tw:lg:rounded-br-[104px] tw:lg:ring-[6px]',
] as const

const SIZES = ['(min-width: 1024px) 30vw, 60vw', '(min-width: 1024px) 22vw, 45vw', '(min-width: 1024px) 30vw, 60vw']

type Tile = { listing: Listing; label: string }

/** The three hero photos, resolved to the listings they belong to. */
const TILES: Tile[] = HERO_SHOWCASE.flatMap(({ listingId, label }) => {
  const listing = LISTINGS.find(item => item.id === listingId)
  return listing ? [{ listing, label }] : []
})

function tileMeta({ kind, district, area }: Listing) {
  return kind === 'roommate' ? `${district} · giá mỗi người` : `${district} · ${area} m²`
}

function PriceTag({ tile: { listing, label } }: { tile: Tile }) {
  return (
    <span
      className={[
        'tw:absolute tw:bottom-2.5 tw:left-2.5 tw:block tw:max-w-[calc(100%-20px)] tw:rounded-2xl tw:border tw:border-glass-line tw:bg-glass',
        'tw:px-2.5 tw:py-1.5 tw:text-ink tw:shadow-[0_12px_28px_-16px_rgb(15_23_42/0.45)] tw:backdrop-blur-md tw:backdrop-saturate-150',
        'tw:transition-transform tw:duration-500 tw:ease-hx tw:motion-safe:group-hover:-translate-y-1 tw:sm:bottom-3.5 tw:sm:left-3.5 tw:sm:px-3.5 tw:sm:py-2.5',
      ].join(' ')}
    >
      <span className="tw:block tw:truncate tw:text-[11px] tw:leading-4 tw:font-medium tw:text-ink-muted tw:sm:text-xs">{label}</span>
      <span className="tw:mt-0.5 tw:block tw:whitespace-nowrap tw:text-sm tw:leading-6 tw:font-bold tw:tracking-tight tw:tabular-nums tw:sm:text-lg">
        {formatMillions(listing.price)}
        <span className="tw:text-[11px] tw:font-medium tw:text-ink-muted tw:sm:text-xs">/tháng</span>
      </span>
      <span className="tw:hidden tw:text-xs tw:text-ink-muted tw:sm:block">{tileMeta(listing)}</span>
    </span>
  )
}

function ShowcaseTile({ tile, index, onOpen }: { tile: Tile; index: number; onOpen: (listingId: string) => void }) {
  const reduce = useReducedMotion()
  const { listing } = tile
  const image = listing.image
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onOpen(listing.id)
  }
  return (
    // The motion wrapper owns placement and the entrance; the link inside owns hover transforms,
    // so motion's inline transform never overrides the CSS hover lift.
    <motion.div
      className={`tw:relative tw:min-h-0 ${TILE_LAYOUT[index]}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.12 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      <a
        href={`#${listingCardId(listing.id)}`}
        onClick={open}
        className={[
          'tw:group tw:relative tw:block tw:h-full tw:overflow-hidden tw:rounded-[inherit] tw:bg-sunken tw:shadow-card',
          'tw:transition-[box-shadow,transform] tw:duration-500 tw:ease-hx tw:hover:shadow-float tw:motion-safe:hover:-translate-y-1',
        ].join(' ')}
      >
        <img
          src={image.srcSmall}
          srcSet={`${image.srcSmall} ${image.width / 2}w, ${image.src} ${image.width}w`}
          sizes={SIZES[index]}
          width={image.width}
          height={image.height}
          alt={image.alt}
          decoding="async"
          fetchPriority={index === 0 ? 'high' : 'auto'}
          className="tw:h-full tw:w-full tw:object-cover tw:transition-transform tw:duration-[900ms] tw:ease-hx tw:motion-safe:group-hover:scale-[1.045]"
        />
        {/* One badge on the lead tile only; three would turn it into decoration. */}
        {index === 0 && listing.tags.includes('verified') && (
          <span className="tw:absolute tw:top-3 tw:right-3 tw:hidden tw:items-center tw:gap-1 tw:rounded-full tw:border tw:border-glass-line tw:bg-glass tw:py-1 tw:pr-2.5 tw:pl-1.5 tw:text-xs tw:font-semibold tw:text-brand-text tw:backdrop-blur-md tw:sm:inline-flex">
            <BadgeCheck className="tw:size-4" aria-hidden="true" />
            Chủ nhà đã xác minh
          </span>
        )}
        <PriceTag tile={tile} />
      </a>
    </motion.div>
  )
}

export function Hero({ onSearch, onShowListing }: {
  onSearch: (query: ListingQuery) => void
  /** Scrolls to that listing's card and highlights it. */
  onShowListing: (listingId: string) => void
}) {

  return (
    <section aria-labelledby="hx-hero-title" className="tw:relative tw:bg-canvas tw:pt-10 tw:pb-16 tw:sm:pt-12 tw:lg:pt-16 tw:lg:pb-24">
      <div className="tw:mx-auto tw:grid tw:max-w-[calc(var(--hx-container)_+_var(--hx-gutter)_*_2)] tw:gap-12 tw:px-(--hx-gutter) tw:lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] tw:lg:items-center tw:lg:gap-14 tw:xl:gap-20">
        <div className="tw:min-w-0">
          <h1
            id="hx-hero-title"
            className="tw:max-w-[17ch] tw:text-[clamp(2.125rem,1.4rem+2.4vw,3.25rem)] tw:leading-[1.08] tw:font-bold tw:tracking-[-0.035em] tw:text-ink"
          >
            Tìm trọ không qua trung gian.{' '}
            <span className="tw:text-brand-text">Ở ghép đúng gu, sống trọn vẹn.</span>
          </h1>
          <p className="tw:mt-6 tw:max-w-[46ch] tw:text-[17px] tw:leading-relaxed tw:text-ink-muted tw:sm:text-lg">
            Nói chuyện thẳng với chủ nhà đã xác minh, xem đúng giá trên từng tin, và tìm người ở cùng hợp nếp sinh hoạt, quanh nơi bạn học và làm ở TP.HCM.
          </p>

          <div className="tw:mt-9">
            <SearchBar onSearch={onSearch} />
          </div>

          <dl className="tw:mt-9 tw:grid tw:max-w-[540px] tw:grid-cols-3" aria-label="Homeji trong số liệu">
            {TRUST_STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={`tw:flex tw:min-w-0 tw:flex-col-reverse tw:justify-end tw:gap-0.5 ${index > 0 ? 'tw:border-l tw:border-line-strong tw:pl-4 tw:sm:pl-6' : 'tw:pr-4 tw:sm:pr-6'}`}
              >
                <dt className="tw:text-[13px] tw:leading-snug tw:text-ink-muted tw:sm:text-sm">
                  {stat.href ? (
                    <a
                      href={stat.href}
                      className="tw:text-ink-muted tw:underline tw:decoration-line-strong tw:underline-offset-4 tw:transition-colors tw:hover:text-brand-text tw:hover:decoration-current"
                    >
                      {stat.label}
                    </a>
                  ) : stat.label}
                </dt>
                <dd className="tw:text-xl tw:font-bold tw:tracking-tight tw:tabular-nums tw:text-ink tw:sm:text-2xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="tw:mx-auto tw:grid tw:aspect-[1/1.04] tw:w-full tw:max-w-[600px] tw:grid-cols-12 tw:grid-rows-12 tw:gap-2.5 tw:sm:gap-3.5 tw:lg:max-w-none">
          {TILES.map((tile, index) => (
            <ShowcaseTile key={tile.listing.id} tile={tile} index={index} onOpen={onShowListing} />
          ))}
        </div>
      </div>
    </section>
  )
}
