import { PremiumBadge } from '../PremiumBadge'

export function PremiumListingPreview() {
  return <section className="pay-premium-value" aria-labelledby="premium-value-title">
    <div className="pay-premium-value__copy">
      <span className="pay-label">Dành cho người đăng tin phòng</span>
      <h2 id="premium-value-title">Để tin của bạn dễ được chú ý hơn</h2>
      <p>Premium thêm khung viền nổi bật, nhãn riêng và ưu tiên hiển thị tin phòng. Tìm phòng, lưu tin và so sánh vẫn dùng được miễn phí.</p>
      <p className="pay-premium-value__note">Các gói Premium có cùng quyền lợi, khác thời hạn sử dụng. Nhãn Premium không thay cho xác minh thông tin phòng.</p>
    </div>
    <div className="pay-premium-value__examples" aria-label="Minh họa cách hiển thị tin đăng">
      {[false, true].map(premium => <div key={String(premium)}>
        <p className="pay-premium-value__label">{premium ? 'Với Premium' : 'Miễn phí'}</p>
        <div className={`pay-listing-preview${premium ? ' premium-listing' : ''}`}>
          <div className="pay-listing-preview__photo" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <div>{premium ? <PremiumBadge /> : <span className="pay-listing-preview__type">Tin phòng</span>}<strong>Tin phòng của bạn</strong><span>Ảnh, giá và thông tin phòng</span></div>
        </div>
      </div>)}
      <p className="pay-premium-value__caption">Hình minh họa · Viền có hiệu ứng nhẹ, tự tắt khi bạn chọn giảm chuyển động.</p>
    </div>
  </section>
}
