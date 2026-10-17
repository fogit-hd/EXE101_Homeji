import './AuthCityScene.css'

/** A static illustration keeps the sign-in form independent of WebGL and motion. */
export function AuthCityScene({ mode }: { mode: 'signin' | 'signup' }) {
  return (
    <section className="auth-city auth-city--panorama" aria-labelledby="auth-city-heading">
      <div className="auth-city__copy">
        <span>HOMEJI · MỘT NƠI ĐỂ THUỘC VỀ</span>
        <h2 id="auth-city-heading">{mode === 'signup' ? <>Hành trình mới.<br />Bắt đầu từ một mái nhà.</> : <>Sài Gòn rộng lớn.<br />Có một nơi chờ bạn.</>}</h2>
        <p>Tìm căn phòng phù hợp và những người bạn cùng chia sẻ nhịp sống thành phố.</p>
      </div>
      <figure className="auth-city__panorama">
        <img src="/images/auth/saigon-vietnam-panorama.webp" width="1536" height="1024" fetchPriority="high"
          alt="Minh họa TP. Hồ Chí Minh với Landmark 81, Bitexco, cờ Việt Nam và dòng sông hướng ra biển, đồng bằng xanh và núi phía xa." />
        <figcaption>TP. Hồ Chí Minh · Phong cảnh Việt Nam được tái hiện bằng AI.</figcaption>
      </figure>
    </section>
  )
}
