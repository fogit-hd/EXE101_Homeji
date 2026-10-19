import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import './ChoicePicker.css'

type Option = { value: string; label: string; disabled: boolean; group: string }
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return Children.toArray(node).map(textOf).join('')
}

function collectOptions(children: ReactNode, group = '', groupDisabled = false): Option[] {
  const result: Option[] = []
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return
    if (child.type === 'option') {
      const label = child.props.label ?? textOf(child.props.children)
      result.push({ value: String(child.props.value ?? label), label, disabled: groupDisabled || !!child.props.disabled, group })
    } else if (child.type === 'optgroup' || child.type === Fragment) {
      result.push(...collectOptions(child.props.children, child.type === 'optgroup' ? child.props.label : group, groupDisabled || !!child.props.disabled))
    }
  })
  return result
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi').trim()
}

function associatedLabel(button: HTMLButtonElement | null) {
  const label = button?.labels?.[0]?.cloneNode(true) as HTMLElement | undefined
  label?.querySelector('.choice-picker')?.remove()
  return label?.textContent?.trim() ?? ''
}

/** Keeps a real select for form submission, validation and existing change handlers. */
export function ChoicePicker({ children, className = '', id: suppliedId, value, defaultValue, disabled, onChange, onInvalid, ...props }: Props) {
  const generatedId = useId()
  const id = suppliedId ?? `choice-${generatedId}`
  const ariaLabel = props['aria-label']
  const ariaLabelledBy = props['aria-labelledby']
  const panelId = `${id}-panel`
  const listId = `${id}-options`
  const native = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const layer = useRef<HTMLDialogElement>(null)
  const [portalHost, setPortalHost] = useState<Element | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const controlledValue = useRef(value)
  const options = useMemo(() => collectOptions(children), [children])
  const [uncontrolled, setUncontrolled] = useState(() => String(defaultValue ?? options[0]?.value ?? ''))
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('Chọn một mục')
  const [active, setActive] = useState('')
  const [invalid, setInvalid] = useState(false)
  const selected = String(value ?? (options.some(option => option.value === uncontrolled) ? uncontrolled : options[0]?.value ?? ''))
  const selectedOption = options.find(option => option.value === selected)
  const visible = options.filter(option => normalize(`${option.label} ${option.group}`).includes(normalize(query)))
  const enabled = visible.filter(option => !option.disabled)
  const activeOption = enabled.find(option => option.value === active) ?? enabled[0]
  const activeId = activeOption ? `${listId}-${options.findIndex(option => option.value === activeOption.value)}` : undefined
  const expanded = open && !disabled

  const close = (restore = true) => {
    // Release native modal inertness before returning keyboard focus to the owner.
    const surface = layer.current
    if (surface?.open) {
      try { surface.close() } catch { surface.removeAttribute('open') }
    }
    setOpen(false)
    if (restore) trigger.current?.focus({ preventScroll: true })
  }

  const show = () => {
    if (disabled || trigger.current?.matches(':disabled')) return
    const label = associatedLabel(trigger.current)
    const labelledBy = props['aria-labelledby']?.split(/\s+/).map(key => document.getElementById(key)?.textContent ?? '').join(' ')
    setTitle(props['aria-label'] || labelledBy || label || props.title || 'Chọn một mục')
    setQuery('')
    setActive(selected)
    setPortalHost(trigger.current?.closest('dialog[open], [role="dialog"][aria-modal="true"]') ?? document.body)
    setOpen(true)
  }

  const choose = (option: Option) => {
    if (option.disabled || native.current?.matches(':disabled') || !native.current) return
    native.current.value = option.value
    // Dispatch a real select change: existing numeric conversions, URL filters and
    // form listeners receive exactly the same event as before the visual upgrade.
    native.current.dispatchEvent(new Event('change', { bubbles: true }))
    close()
  }

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'Tab') { close(); return }
    if (event.key === 'Enter') { event.preventDefault(); if (activeOption) choose(activeOption); return }
    const index = enabled.findIndex(option => option.value === activeOption?.value)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
      if (enabled[next]) setActive(enabled[next].value)
    }
  }

  useLayoutEffect(() => {
    controlledValue.current = value
  }, [value])

  useLayoutEffect(() => {
    if (ariaLabel || ariaLabelledBy) return
    const label = associatedLabel(trigger.current)
    if (label) trigger.current?.setAttribute('aria-label', label)
  }, [children, id, ariaLabel, ariaLabelledBy])

  useEffect(() => {
    if (!disabled) return
    // A parent can disable a field while an asynchronous form operation starts.
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setOpen(false) })
    return () => { cancelled = true }
  }, [disabled])

  useEffect(() => {
    const form = native.current?.form
    let resetTimer: ReturnType<typeof setTimeout> | undefined
    const reset = () => {
      setInvalid(false)
      setOpen(false)
      // Native reset happens after the reset event. Restore our state afterwards,
      // including a controlled value that a parent may update in its own handler.
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        if (!native.current) return
        if (controlledValue.current === undefined) {
          const initial = String(defaultValue ?? options[0]?.value ?? '')
          native.current.value = initial
          setUncontrolled(initial)
        }
        else native.current.value = String(controlledValue.current)
      }, 0)
    }
    form?.addEventListener('reset', reset)
    return () => { form?.removeEventListener('reset', reset); clearTimeout(resetTimer) }
  }, [value, defaultValue, options])

  useLayoutEffect(() => {
    if (!expanded) return
    const surface = layer.current
    if (!surface) return
    // Native modal top layer escapes glass/transform stacking contexts. Keep the
    // DOM inside its owner as well, so custom focus traps recognise the options.
    try {
      if (typeof surface.showModal === 'function') surface.showModal()
      else surface.setAttribute('open', '')
    } catch { surface.setAttribute('open', '') }
    const dismissWithOwner = () => setOpen(false)
    portalHost?.addEventListener('close', dismissWithOwner)
    const ownerVisibility = new MutationObserver(() => {
      if (trigger.current?.matches(':disabled') || trigger.current?.closest('[inert], [hidden], [aria-hidden="true"]')
        || (typeof HTMLDialogElement === 'function' && portalHost instanceof HTMLDialogElement && !portalHost.open)) setOpen(false)
    })
    for (let owner = trigger.current?.parentElement; owner && owner !== document.body; owner = owner.parentElement)
      ownerVisibility.observe(owner, { attributes: true, attributeFilter: ['inert', 'hidden', 'aria-hidden', 'open', 'disabled'] })
    const position = () => {
      if (!trigger.current || !panel.current) return
      const rect = trigger.current.getBoundingClientRect()
      const viewport = window.visualViewport
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const offsetTop = viewport?.offsetTop ?? 0
      const offsetLeft = viewport?.offsetLeft ?? 0
      const mobile = width <= 640
      const below = height + offsetTop - rect.bottom - 16
      const above = rect.top - offsetTop - 16
      const upward = !mobile && below < 280 && above > below
      const viewportHeight = Math.max(0, height - 24)
      const room = Math.max(0, Math.min(430, viewportHeight, upward ? above : below))
      const floating = !mobile && room < 180
      const available = mobile || floating ? viewportHeight : room
      panel.current.style.minHeight = `${Math.min(120, available)}px`
      panel.current.dataset.compact = String(available < 300)
      Object.assign(panel.current.style, mobile ? {
        width: `${Math.max(0, width - 24)}px`, left: `${offsetLeft + 12}px`, top: `${offsetTop + height - 12}px`,
        transform: 'translateY(-100%)', maxHeight: `${available}px`,
      } : {
        width: `${Math.min(Math.max(rect.width, 320), width - 24)}px`,
        left: `${Math.max(offsetLeft + 12, Math.min(rect.left, offsetLeft + width - Math.min(Math.max(rect.width, 320), width - 24) - 12))}px`,
        top: `${floating ? offsetTop + 12 : upward ? rect.top - 8 : rect.bottom + 8}px`, transform: upward && !floating ? 'translateY(-100%)' : 'none', maxHeight: `${available}px`,
      })
      panel.current.dataset.placement = mobile ? 'sheet' : floating ? 'viewport' : upward ? 'above' : 'below'
    }
    position()
    search.current?.focus({ preventScroll: true })
    const dismiss = (event: FocusEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('focusin', dismiss)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      portalHost?.removeEventListener('close', dismissWithOwner)
      ownerVisibility.disconnect()
      if (surface.open) {
        try { surface.close() } catch { surface.removeAttribute('open') }
      }
      document.removeEventListener('focusin', dismiss)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
    }
  }, [expanded, portalHost])

  useEffect(() => {
    if (!expanded || !activeId) return
    document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId, expanded])

  return <span className="choice-picker" data-disabled={disabled || undefined}>
    <button ref={trigger} id={id} type="button" role="combobox" className={`choice-picker__trigger ${className}`}
      disabled={disabled} aria-expanded={expanded} aria-haspopup="dialog" aria-controls={expanded ? panelId : undefined}
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']}
      aria-required={props.required} aria-invalid={invalid || props['aria-invalid']} title={props.title}
      onClick={() => expanded ? close() : show()}
      onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); show() } }}>
      <span className="choice-picker__value">{selectedOption?.label || 'Chọn một mục'}</span>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <select {...props} id={`${id}-native`} className="choice-picker__native" aria-hidden="true" tabIndex={-1}
      value={selected} disabled={disabled} ref={native}
      onChange={event => { setUncontrolled(event.currentTarget.value); setInvalid(false); onChange?.(event) }}
      onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); onInvalid?.(event) }}>
      {children}
    </select>
    {invalid && <span className="choice-picker__error" role="alert">Vui lòng chọn một mục hợp lệ.</span>}
    {expanded && portalHost && createPortal(<dialog ref={layer} id={panelId} className="choice-picker-layer" aria-label={title}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close() }}
      onClose={event => { event.stopPropagation(); setOpen(false) }}>
      <div className="choice-picker__scrim" onPointerDown={() => close()} aria-hidden="true" />
      <section ref={panel} className="choice-picker__panel liquid-surface" aria-label={title}
        onPointerDown={event => event.stopPropagation()} onMouseDown={event => event.stopPropagation()}
        onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }}>
        <div className="choice-picker__handle" aria-hidden="true" />
        <header className="choice-picker__heading"><div><span className="choice-picker__eyebrow">LỰA CHỌN CỦA BẠN</span><strong>{title}</strong></div>
          <button className="choice-picker__close" type="button" aria-label="Đóng bảng chọn" onClick={() => close()}>×</button>
        </header>
        <div className="choice-picker__search-wrap"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" /></svg>
          <input ref={search} type="search" role="combobox" aria-label={`Tìm trong ${title}`} placeholder="Gõ để tìm lựa chọn…"
            value={query} onChange={event => { setQuery(event.target.value); setActive('') }} onKeyDown={onSearchKey}
            aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={activeId} />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <div id={listId} role="listbox" aria-label={title} className="choice-picker__options">
          {visible.map((option, index) => <Fragment key={`${option.group}:${option.value}`}>
            {option.group && option.group !== visible[index - 1]?.group && <div className="choice-picker__group" role="presentation">{option.group}</div>}
            <button type="button" role="option" tabIndex={-1} id={`${listId}-${options.indexOf(option)}`}
              aria-selected={selected === option.value} aria-disabled={option.disabled || undefined}
              disabled={option.disabled} className="choice-picker__option" data-active={activeOption?.value === option.value || undefined}
              onPointerMove={() => { if (!option.disabled) setActive(option.value) }} onClick={() => choose(option)}>
              <span className="choice-picker__radio" aria-hidden="true" /><span>{option.label}</span>
              {selected === option.value && <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </button>
          </Fragment>)}
          {!visible.length && <p className="choice-picker__empty" role="status">Không có lựa chọn phù hợp. Thử từ khóa khác.</p>}
        </div>
        <footer className="choice-picker__foot"><span role="status">{visible.length} lựa chọn{query ? ' phù hợp' : ''}</span><span>↑ ↓ để duyệt · Enter để chọn</span></footer>
      </section>
    </dialog>, portalHost)}
  </span>
}
