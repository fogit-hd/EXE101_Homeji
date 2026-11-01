import { useEffect } from 'react'
import { requestSiteLocationOnce } from '../../lib/siteLocation'
export function SiteLocationBootstrap({ enabled }: { enabled: boolean }) {
  useEffect(() => { if (enabled) void requestSiteLocationOnce() }, [enabled])
  return null
}
