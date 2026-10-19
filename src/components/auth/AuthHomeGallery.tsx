import { useEffect, useState } from 'react'
import './AuthHomeGallery.css'

// Existing Homeji illustrations only; decorative crops are not rental listings.
const photos = [
  { src: '/landing/bloom-hero-bg.png', position: '50% 50%' },
  { src: '/figma/images/room-1.jpg', position: '50% 50%' },
  { src: '/landing/bloom-hero-bg.png', position: '85% 35%' },
  { src: '/figma/images/room-2.jpg', position: '50% 50%' },
]
const columns = [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1]]

/** Seamless slow photo wall; CSS moves three tracks, never the form. */
export function AuthHomeGallery() {
  const [hidden, setHidden] = useState(() => document.hidden)
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  return <aside className="auth-home-gallery" aria-label="Những mái nhà Homeji" data-paused={hidden || undefined}>
    <div className="auth-home-gallery__wall" aria-hidden="true">
      {columns.map((column, index) => <div className="auth-home-gallery__column" key={index}>
        <div className="auth-home-gallery__track">
          {[0, 1].map(copy => <div className="auth-home-gallery__set" key={copy}>
            {column.map((photo, order) => <div className="auth-home-gallery__photo" key={photo}>
              <img src={photos[photo].src} alt="" width="400" height="540" draggable={false}
                decoding="async" fetchPriority={index === 0 && copy === 0 && order === 0 ? 'high' : 'low'}
                style={{ objectPosition: photos[photo].position }} />
            </div>)}
          </div>)}
        </div>
      </div>)}
    </div>
    <div className="auth-home-gallery__caption"><span>MỘT NƠI ĐỂ THUỘC VỀ</span><p>Mỗi mái nhà,<br />một khởi đầu mới.</p></div>
  </aside>
}
