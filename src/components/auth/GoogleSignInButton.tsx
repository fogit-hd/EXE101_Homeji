import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import { googleOAuthClientId } from '../../lib/googleOAuthClient'

type Props = {
  onSuccess: (response: CredentialResponse) => void
  onError: () => void
}

/** Renders nothing when VITE_GOOGLE_CLIENT_ID is empty so login stays usable. */
export function GoogleSignInButton({ onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState(280)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(container)
      const availableWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setButtonWidth(Math.max(200, Math.min(280, Math.floor(availableWidth))))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
  if (!googleOAuthClientId) return null
  return (
    <div ref={containerRef} className="google-signin">
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      shape="pill"
      theme="outline"
      size="large"
      text="signin_with"
      width={String(buttonWidth)}
    />
      <small>Tiếp tục an toàn với tài khoản Google</small>
    </div>
  )
}
