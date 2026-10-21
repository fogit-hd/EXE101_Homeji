import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'

import { createPortal } from 'react-dom'

export type Slots = {
  actionsEl: HTMLElement | null
  filtersEl: HTMLElement | null
}

export const PageFrameSlotsContext = createContext<Slots | null>(null)

export function usePageFrameChromeActive(): boolean {
  return useContext(PageFrameSlotsContext) != null
}

export function usePageFrameChromePortals(slots: {
  actions?: ReactNode
  filters?: ReactNode
}): ReactNode {
  const hosts = useContext(PageFrameSlotsContext)
  if (!hosts) return null

  return (
    <>
      {slots.actions && hosts.actionsEl
        ? createPortal(slots.actions, hosts.actionsEl)
        : null}
      {slots.filters && hosts.filtersEl
        ? createPortal(slots.filters, hosts.filtersEl)
        : null}
    </>
  )
}
