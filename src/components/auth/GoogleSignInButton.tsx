import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { googleOAuthClientId } from '../../lib/googleOAuthClient'

type Props = {
  onSuccess: (response: CredentialResponse) => void
  onError: () => void
}

/** Renders nothing when VITE_GOOGLE_CLIENT_ID is empty so login stays usable. */
export function GoogleSignInButton({ onSuccess, onError }: Props) {
  if (!googleOAuthClientId) return null
  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      shape="rectangular"
      theme="outline"
      size="large"
      text="signin_with"
      width="100%"
    />
  )
}
