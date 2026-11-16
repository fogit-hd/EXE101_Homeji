import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'

export type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Shared = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Icon before the label. */
  icon?: ReactNode
  /** Icon after the label. */
  trailingIcon?: ReactNode
  block?: boolean
  className?: string
  children: ReactNode
}

function buttonClass({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
}: Pick<Shared, 'variant' | 'size' | 'block' | 'className'>) {
  return ['hx-btn', `hx-btn--${variant}`, `hx-btn--${size}`, block ? 'hx-btn--block' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = Shared &
  Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className'> & {
    loading?: boolean
    /** Announced while loading instead of the label. */
    loadingLabel?: string
  }

export function Button({
  variant,
  size,
  icon,
  trailingIcon,
  block,
  className,
  children,
  loading = false,
  loadingLabel = 'Đang xử lý',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoaderCircle className="hx-btn__spinner" aria-hidden="true" /> : icon}
      <span className="hx-btn__label">{children}</span>
      {loading ? <span className="hx-sr-only">{loadingLabel}</span> : trailingIcon}
    </button>
  )
}

type ButtonLinkProps = Shared &
  Omit<ComponentPropsWithoutRef<'a'>, 'children' | 'className' | 'href'> & {
    /** Internal route (react-router) or in-page hash (#id). */
    to: string
  }

/** A link styled as a button; hashes stay plain anchors so the browser scrolls natively. */
export function ButtonLink({ variant, size, icon, trailingIcon, block, className, children, to, ...rest }: ButtonLinkProps) {
  const classes = buttonClass({ variant, size, block, className })
  const inner = (
    <>
      {icon}
      <span className="hx-btn__label">{children}</span>
      {trailingIcon}
    </>
  )
  if (to.startsWith('#')) {
    return <a href={to} className={classes} {...rest}>{inner}</a>
  }
  return <Link to={to} className={classes} {...rest}>{inner}</Link>
}
