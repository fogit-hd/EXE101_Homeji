import { useRef, useState, useEffect } from 'react'
import { apiRequest } from '../../../api/client'
import { getErrorMessage } from '../../../lib/errors'
import './FoodSourceDirectory.css'

type FoodSourcePlace = {
  id: string; name: string; address: string; sourceUrl: string
  mapsSearchUrl: string; verificationNote: string; collectedAt: string
}

function safeLink(raw: string, maps = false): string | null {
  try {
    const url = new URL(raw)
    const hosts = maps ? ['www.google.com'] : ['www.nhatot.com', 'shopeefood.vn', 'vinwonders.com', 'www.tiemcomvien.com', 'www.google.com']
    return url.protocol === 'https:' && !url.username && !url.password && hosts.includes(url.hostname)
      && (url.hostname !== 'www.google.com' || url.pathname.startsWith('/maps/'))
      && (!maps || url.pathname === '/maps/search/') ? url.href : null
  } catch { return null }
}

export function FoodSourceDirectory() {
  const [items, setItems] = useState<FoodSourcePlace[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => () => { request.current += 1 }, [])
  const load = async () => {
    const current = ++request.current
    setLoading(true); setError('')
    try {
      const result = await apiRequest<FoodSourcePlace[]>('/api/food-source-places', { auth: false })
      if (current === request.current) { setItems(result); setLoaded(true) }
    } catch (reason) {
      if (current === request.current) setError(getErrorMessage(reason, 'Chưa tải được danh sách quán.'))
    } finally { if (current === request.current) setLoading(false) }
  }
  return <section className="food-source-directory" aria-label="Quán ăn Quận 9 từ nguồn công khai">
    <h2>Quán ăn tại Quận 9</h2>
    <p>Địa chỉ từ bài viết và trang đặt món công khai. Hãy kiểm tra nguồn trước khi ghé quán; Homeji chưa xác nhận tình trạng hoạt động.</p>
    <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => void load()}>
      {loading ? 'Đang tải…' : loaded ? 'Tải lại danh sách quán' : 'Xem danh sách quán có nguồn'}
    </button>
    {error && <p role="alert">{error}</p>}
    {loaded && !items.length && <p>Chưa có quán trong danh sách nguồn.</p>}
    <div className="food-source-directory__grid">{items.map(item => {
      const source = safeLink(item.sourceUrl)
      const maps = safeLink(item.mapsSearchUrl, true)
      return <article key={item.id}>
        <h3>{item.name}</h3><p>{item.address}</p><small>{item.verificationNote}</small>
        <div>{source && <a href={source} target="_blank" rel="noopener noreferrer">Bài viết / trang quán</a>}
          {maps && <a href={maps} target="_blank" rel="noopener noreferrer">Tìm trên Google Maps</a>}</div>
      </article>
    })}</div>
  </section>
}
