import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import { googleOAuthClientId } from '../../lib/googleOAuthClient'
import { observeElementResize } from '../../lib/observeElementResize'
import { useTheme } from '../../contexts/ThemeContext'

type Props = {
  onSuccess: (response: CredentialResponse) => void
  onError: () => void
  maxWidth?: number
}

/** Renders nothing when VITE_GOOGLE_CLIENT_ID is empty so login stays usable. */
export function GoogleSignInButton({ onSuccess, onError, maxWidth = 280 }: Props) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [buttonWidth, setButtonWidth] = useState(280)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = () => {
      const style = getComputedStyle(container)
      const availableWidth = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      setButtonWidth(Math.max(200, Math.min(maxWidth, Math.floor(availableWidth))))
    }
    measure()
    return observeElementResize([container], measure)
  }, [maxWidth])
  if (!googleOAuthClientId) return null
  return (
    <div ref={containerRef} className="google-signin" data-glass-exclude>
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      shape="pill"
      theme={theme === 'dark' ? 'filled_black' : 'outline'}
      size="large"
      text="signin_with"
      width={String(buttonWidth)}
    />
      <small>Tiếp tục an toàn với tài khoản Google</small>
    </div>
  )
}
