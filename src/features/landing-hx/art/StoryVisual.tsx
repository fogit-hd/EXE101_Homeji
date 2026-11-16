import { BadgeCheck, HeartHandshake, KeyRound, MapPin } from 'lucide-react'
import type { Listing } from '../../../lib/mock/homeji'
import { formatPrice } from '../sections/format'

/**
 * One stage, four states of the same story. `step` picks which layers show;
 * every change is a CSS transition on opacity/transform (see story.css).
 * Decorative: the chapter text beside it carries the meaning.
 */
export function StoryVisual({ step, listing }: { step: number; listing: Listing }) {
  return (
    <div className="hx-sv" data-step={step} aria-hidden="true">
      <div className="hx-sv__stage">
        {/* 1. lost: a pile of doubtful posts */}
        <div className="hx-sv__layer hx-sv__lost">
          {[0, 1, 2].map(index => (
            <div key={index} className={`hx-sv__fake hx-sv__fake--${index}`}>
              <div className="hx-sv__fake-img" />
              <div className="hx-sv__fake-line" />
              <div className="hx-sv__fake-line hx-sv__fake-line--short" />
              <span className="hx-sv__fake-price">{['1.2tr??', 'Giá liên hệ', 'Cọc ngay!'][index]}</span>
              <span className="hx-sv__fake-stamp">{['Ảnh mạng?', 'Đã có người cọc', 'Không rõ chủ'][index]}</span>
            </div>
          ))}
        </div>

        {/* 2. verified: one clear, checked listing */}
        <div className="hx-sv__layer hx-sv__verified">
          <div className="hx-sv__card">
            <img src={listing.image.srcSmall} alt="" width="320" height="200" decoding="async" loading="lazy" />
            <div className="hx-sv__card-body">
              <span className="hx-sv__badge"><BadgeCheck /> Đã xác minh</span>
              <p className="hx-sv__card-title">{listing.title}</p>
              <p className="hx-sv__card-meta"><MapPin /> {listing.district}</p>
              <p className="hx-sv__card-price"><strong>{formatPrice(listing.price)}</strong> /tháng</p>
            </div>
          </div>
          <div className="hx-sv__filters">
            <span>Gần trường</span>
            <span>Dưới 3 triệu</span>
            <span className="is-on">Chủ nhà đã xác minh</span>
          </div>
        </div>

        {/* 3. match: two people, one rhythm */}
        <div className="hx-sv__layer hx-sv__match">
          <div className="hx-sv__person hx-sv__person--a">
            <span className="hx-sv__face">An</span>
            <ul>
              <li>Ngủ trước 12h</li>
              <li>Ngân sách 2 triệu</li>
            </ul>
          </div>
          <svg className="hx-sv__link" viewBox="0 0 120 40" fill="none">
            <path d="M4 20c30-18 82-18 112 0" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 7" strokeLinecap="round" />
          </svg>
          <span className="hx-sv__heart"><HeartHandshake /></span>
          <div className="hx-sv__person hx-sv__person--b">
            <span className="hx-sv__face">Trang</span>
            <ul>
              <li>Ngủ trước 12h</li>
              <li>Ngân sách 2,2 triệu</li>
            </ul>
          </div>
        </div>

        {/* 4. home: the room lights up, the key is handed over */}
        <div className="hx-sv__layer hx-sv__home">
          <svg className="hx-sv__room" viewBox="0 0 360 260" fill="none">
            <rect x="8" y="8" width="344" height="244" rx="20" fill="var(--hx-wall)" />
            <ellipse className="hx-sv__glow" cx="250" cy="96" rx="130" ry="96" fill="var(--hx-glow)" />
            <rect x="34" y="40" width="96" height="84" rx="8" fill="var(--hx-paper)" stroke="var(--hx-ink)" strokeWidth="2.5" />
            <path d="M82 40v84M34 82h96" stroke="var(--hx-ink)" strokeWidth="2" />
            <circle cx="112" cy="58" r="8" fill="var(--hx-glow)" stroke="var(--hx-ink)" strokeWidth="1.5" />
            <path d="M40 206h168v-36a14 14 0 0 0-14-14H54a14 14 0 0 0-14 14v36Z" fill="var(--hx-emerald-400)" stroke="var(--hx-ink)" strokeWidth="2.5" />
            <rect x="52" y="140" width="52" height="22" rx="8" fill="var(--hx-paper)" stroke="var(--hx-ink)" strokeWidth="2" />
            <path d="M40 206v20M208 206v20" stroke="var(--hx-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M250 226v-118" stroke="var(--hx-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M226 108h48l-10-30h-28l-10 30Z" fill="var(--hx-orange-200)" stroke="var(--hx-ink)" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M236 226h28" stroke="var(--hx-ink)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M290 226c-4-24 6-40 22-46 6 18 0 36-22 46Z" fill="var(--hx-emerald-500)" stroke="var(--hx-ink)" strokeWidth="2" />
            <rect x="296" y="208" width="30" height="18" rx="4" fill="var(--hx-orange-500)" stroke="var(--hx-ink)" strokeWidth="2" />
            <path d="M8 232h344" stroke="var(--hx-ink)" strokeWidth="2.5" />
            <rect className="hx-sv__night" x="8" y="8" width="344" height="244" rx="20" fill="var(--hx-slate-900)" />
          </svg>
          <div className="hx-sv__key">
            <KeyRound />
            <span>Chìa khóa phòng 302</span>
          </div>
        </div>
      </div>
    </div>
  )
}
