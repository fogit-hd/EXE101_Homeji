import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { RentalResultCard } from '../../src/components/map/listings/RentalResultCard'
import { FeaturedListingBadge } from '../../src/components/map/listings/featured/FeaturedListingBadge'
import '../../src/index.css'
import '../../src/home-refinement.css'

document.documentElement.dataset.theme = 'light'
function Fixture() {
  const [featured, setFeatured] = useState(true)
  const [status, setStatus] = useState('')
  return <div className="app-shell--authed app-shell--listings"><main className="map-listings" style={{ padding: 32 }}>
    <button onClick={() => setFeatured(v => !v)}>Đổi trạng thái Nổi bật</button><p role="status">{status}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 24 }}>
      {[0,1,2].map(index => <RentalResultCard key={index} id={`room-${index}`} title={`Phòng thử ${index}`} price="3.500.000 đ" area="30 m²" propertyType="Phòng trọ" address="Lê Văn Việt, Thủ Đức" photo="/landing/listings/loft-studio-640.webp" amenities={['Máy lạnh','Bếp']} selectedAmenities={[]}
        featured={index === 0 ? featured : index === 1} badge={(index === 0 ? featured : index === 1) ? <FeaturedListingBadge /> : undefined}
        onSelect={() => setStatus(`map-${index}`)} onDetail={() => setStatus(`detail-${index}`)}
        save={<button aria-label={`Lưu phòng ${index}`} onClick={() => setStatus(`save-${index}`)}>Lưu</button>}
        secondaryAction={<button onClick={() => setStatus(`consider-${index}`)}>Cân nhắc</button>} />)}
    </div>
  </main></div>
}
const root = createRoot(document.getElementById('root')!)
root.render(<BrowserRouter><Fixture /></BrowserRouter>)
Object.assign(window, { unmountFeaturedFixture: () => root.unmount() })
