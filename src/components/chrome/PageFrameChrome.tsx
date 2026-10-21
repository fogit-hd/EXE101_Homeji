import {
  type ReactNode
} from 'react'
import { PageFrameSlotsContext } from "./PageFrameChrome.logic"

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
