import { ga4Configured, privacySignalEnabled, readAnalyticsConsent, setAnalyticsConsent, setAnalyticsPage, trackFunnelEvent } from './lib/ga4'

// The public document works without JavaScript. Only optional analytics needs this entry point.
if (ga4Configured) {
  const choice = document.createElement('aside')
  choice.className = 'analytics-public'
  choice.setAttribute('aria-label', 'Lựa chọn thống kê')
  let editing = false
  let viewTracked = false
  const render = () => {
    const consent = readAnalyticsConsent()
    setAnalyticsPage(location.pathname, location.search)
    if (consent === 'accepted' && !viewTracked) {
      trackFunnelEvent('rental_view')
      viewTracked = true
    }
    choice.replaceChildren()
    if (consent !== 'unknown' && !editing) {
      const options = document.createElement('button')
      options.textContent = 'Tùy chọn thống kê'
      options.onclick = () => { editing = true; render() }
      choice.append(options)
      return
    }
    const text = document.createElement('p')
    text.textContent = 'Bạn có đồng ý dùng Google Analytics để đo nhóm màn hình và thao tác? Homeji không gửi nội dung tìm kiếm, email hoặc tin nhắn. Bạn có thể đổi lựa chọn bất cứ lúc nào.'
    const privacy = document.createElement('a')
    privacy.href = '/privacy'; privacy.textContent = 'Quyền riêng tư'
    const reject = document.createElement('button')
    reject.textContent = 'Từ chối thống kê'
    reject.onclick = () => { editing = false; setAnalyticsConsent('rejected') }
    const accept = document.createElement('button')
    accept.textContent = 'Đồng ý thống kê'
    accept.disabled = privacySignalEnabled()
    accept.onclick = () => { editing = false; setAnalyticsConsent('accepted') }
    choice.append(text, privacy, reject, accept)
  }
  document.body.append(choice)
  window.addEventListener('homeji:analytics-consent', render)
  window.addEventListener('storage', render)
  render()
}
