import { useId, useState } from 'react'
import { VIETNAM_BANKS } from '../../../lib/vietnamBanks'
import './BankNameInput.css'

const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().trim()

/** Editable bank suggestions; the server remains responsible for recipient validation. */
export function BankNameInput({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = VIETNAM_BANKS.filter(bank => normalize(`${bank.shortName} ${bank.code} ${bank.name}`).includes(normalize(value)))
  const choose = (name: string) => { onChange(name); setOpen(false); setActive(-1) }
  return <div className="wallet-field bank-name" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) }
  }}>
    <label htmlFor={id}>Tên ngân hàng</label>
    <div className="bank-name__control">
      <input id={id} role="combobox" value={value} maxLength={120} autoComplete="off"
        placeholder="Chọn hoặc nhập tên ngân hàng"
        aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        onFocus={() => { setOpen(true); setActive(-1) }}
        onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1) }
          if (event.key === 'Tab') { setOpen(false); setActive(-1) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true)
            const next = matches.length ? (active < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length) : -1
            setActive(next)
            requestAnimationFrame(() => document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: 'nearest' }))
          }
          if (event.key === 'Enter' && open && active >= 0 && matches[active]) { event.preventDefault(); choose(matches[active].shortName) }
        }} />
    </div>
    {open ? <div className="bank-name__suggestions">
      <ul id={`${id}-list`} role="listbox" aria-label="Ngân hàng gợi ý">
        {matches.map((bank, index) => <li key={bank.code} id={`${id}-option-${index}`} role="option"
          aria-selected={active === index} onMouseDown={event => event.preventDefault()}
          onClick={() => choose(bank.shortName)}>
          <strong>{bank.shortName}</strong><span>{bank.name}</span>
        </li>)}
      </ul>
      {!matches.length ? <p role="status">Không có gợi ý phù hợp. Bạn có thể dùng tên đã nhập.</p> : null}
    </div> : null}
    <small id={`${id}-help`}>Gõ tên/viết tắt để tìm, hoặc nhập ngân hàng khác.</small>
    {error ? <small id={`${id}-error`} className="is-error">{error}</small> : null}
  </div>
}
