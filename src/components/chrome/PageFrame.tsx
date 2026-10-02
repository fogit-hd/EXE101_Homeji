import { useState, type ReactNode } from 'react'
import { AppContainer } from './AppContainer'
import { PageFrameSlotsProvider } from './PageFrameChrome'
import './PageFrame.css'

type Props = {
  title: string
  eyebrow?: string
  lead?: string
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
  className?: string
  /** Skip outer AppContainer (e.g. messages full-bleed). */
  bleed?: boolean
  /**
   * When true, expose empty header hosts so embedded children can portal
   * CTA / filters via usePageFrameChromePortals (FeatureWorkspace).
   */
  chromeSlots?: boolean
}

export function PageFrame({
  title,
  eyebrow,
  lead,
  actions,
  filters,
  children,
  className = '',
  bleed = false,
  chromeSlots = false,
}: Props) {
  const [actionsEl, setActionsEl] = useState<HTMLElement | null>(null)
  const [filtersEl, setFiltersEl] = useState<HTMLElement | null>(null)

  const showActionsHost = Boolean(actions) || chromeSlots
  const showFiltersHost = Boolean(filters) || chromeSlots

  const body = (
    <>
      <header className="page-frame__header">
        <div className="page-frame__title-row">
          <div className="page-frame__copy">
            {eyebrow ? <p className="page-frame__eyebrow">{eyebrow}</p> : null}
            <h1 className="page-frame__title">{title}</h1>
            {lead ? <p className="page-frame__lead">{lead}</p> : null}
          </div>
          {showActionsHost ? (
            <div
              className="page-frame__actions"
              ref={chromeSlots ? setActionsEl : undefined}
            >
              {actions}
            </div>
          ) : null}
        </div>
        {showFiltersHost ? (
          <div
            className="page-frame__filters"
            ref={chromeSlots ? setFiltersEl : undefined}
          >
            {filters}
          </div>
        ) : null}
      </header>
      <div className="page-frame__body">
        {chromeSlots ? (
          <PageFrameSlotsProvider actionsEl={actionsEl} filtersEl={filtersEl}>
            {children}
          </PageFrameSlotsProvider>
        ) : (
          children
        )}
      </div>
    </>
  )

  if (bleed) {
    return (
      <div className={`page-frame page-frame--bleed ${className}`.trim()}>{body}</div>
    )
  }

  return (
    <AppContainer className={`page-frame ${className}`.trim()}>{body}</AppContainer>
  )
}
