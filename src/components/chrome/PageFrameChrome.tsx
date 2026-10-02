import {
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

type Slots = {
  actionsEl: HTMLElement | null
  filtersEl: HTMLElement | null
}

const PageFrameSlotsContext = createContext<Slots | null>(null)

/** Provides DOM hosts in PageFrame header for embedded page CTA / filters. */
export function PageFrameSlotsProvider({
  children,
  actionsEl,
  filtersEl,
}: {
  children: ReactNode
  actionsEl: HTMLElement | null
  filtersEl: HTMLElement | null
}) {
  return (
    <PageFrameSlotsContext.Provider value={{ actionsEl, filtersEl }}>
      {children}
    </PageFrameSlotsContext.Provider>
  )
}

export function usePageFrameChromeActive(): boolean {
  return useContext(PageFrameSlotsContext) != null
}

/**
 * Portal CTA / filter rows into the surrounding PageFrame header.
 * No-op when the page wraps its own PageFrame (no slot provider).
 */
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
