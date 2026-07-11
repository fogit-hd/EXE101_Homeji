import { AuthPage } from './AuthPage'

/** Route `/login` — Sign In tĩnh (không intro). */
export function LoginPage() {
  return <AuthPage initialMode="signin" />
}
