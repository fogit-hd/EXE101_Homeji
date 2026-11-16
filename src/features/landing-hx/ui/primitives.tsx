import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from 'react'

/* Container ---------------------------------------------------------------- */

type ContainerProps = {
  as?: ElementType
  size?: 'md' | 'lg'
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>

export function Container({ as: Tag = 'div', size = 'lg', className, children, ...rest }: ContainerProps) {
  return (
    <Tag className={['hx-container', size === 'md' ? 'hx-container--md' : '', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  )
}

/* Badge -------------------------------------------------------------------- */

export type BadgeTone = 'verified' | 'available' | 'roommate' | 'new' | 'neutral'

export function Badge({ tone = 'neutral', icon, children, className }: {
  tone?: BadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span className={['hx-badge', `hx-badge--${tone}`, className ?? ''].filter(Boolean).join(' ')}>
      {icon}
      {children}
    </span>
  )
}

/* Card --------------------------------------------------------------------- */

export function Card({ as: Tag = 'div', interactive = false, className, children, ...rest }: {
  as?: ElementType
  interactive?: boolean
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'children'>) {
  return (
    <Tag className={['hx-card', interactive ? 'hx-card--interactive' : '', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  )
}

/* SectionHeading ----------------------------------------------------------- */

export function SectionHeading({ id, title, lead, align = 'start', level = 2, action }: {
  id?: string
  title: ReactNode
  lead?: ReactNode
  align?: 'start' | 'center'
  level?: 1 | 2 | 3
  /** Optional control placed beside the heading on wide screens. */
  action?: ReactNode
}) {
  const Heading = `h${level}` as const
  return (
    <div className={`hx-heading hx-heading--${align}${action ? ' hx-heading--with-action' : ''}`}>
      <div className="hx-heading__text">
        <Heading id={id} className="hx-heading__title">{title}</Heading>
        {lead ? <p className="hx-heading__lead">{lead}</p> : null}
      </div>
      {action ? <div className="hx-heading__action">{action}</div> : null}
    </div>
  )
}

/* IconButton --------------------------------------------------------------- */

export function IconButton({ label, icon, variant = 'ghost', size = 'md', className, type = 'button', ref, ...rest }: {
  ref?: Ref<HTMLButtonElement>
  /** Accessible name; icon-only buttons always need one. */
  label: string
  icon: ReactNode
  variant?: 'ghost' | 'outline' | 'solid'
  size?: 'sm' | 'md'
  className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children' | 'aria-label'>) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={['hx-icon-btn', `hx-icon-btn--${variant}`, `hx-icon-btn--${size}`, className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon}
    </button>
  )
}
