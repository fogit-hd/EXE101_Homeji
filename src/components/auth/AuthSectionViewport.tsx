import type { ReactNode } from 'react'

/** A stable slot: swapping forms never repositions the surrounding chrome. */
export function AuthSectionViewport({ children }: { children: ReactNode }) {
  return <div className="auth-unified__viewport">{children}</div>
}
