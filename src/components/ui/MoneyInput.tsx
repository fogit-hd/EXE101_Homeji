import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string | number | null | undefined
  onValueChange: (value: string) => void
}

function formatMoneyInput(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Keep unformatted digits in form state and restore the caret after grouping. */
export function MoneyInput({ value: suppliedValue, onValueChange, min = 0, max, ...props }: Props) {
  const value = String(suppliedValue ?? '')
  const input = useRef<HTMLInputElement>(null)
  const caretDigits = useRef<number | null>(null)
  const formatted = formatMoneyInput(value)
  useLayoutEffect(() => {
    input.current?.setCustomValidity(value && (Number(value) < Number(min) || max != null && Number(value) > Number(max)) ? `Vui lòng nhập từ ${formatMoneyInput(String(min))}${max != null ? ` đến ${formatMoneyInput(String(max))}` : ' trở lên'}.` : '')
  }, [value, min, max])
  useLayoutEffect(() => {
    if (caretDigits.current === null || !input.current) return
    let position = 0, digits = 0
    while (position < formatted.length && digits < caretDigits.current) {
      if (/\d/.test(formatted[position])) digits++
      position++
    }
    input.current.setSelectionRange(position, position)
    caretDigits.current = null
  }, [formatted])
  return <input {...props} ref={input} type="text" inputMode="numeric" pattern="[0-9.]+" value={formatted}
    onChange={event => {
      const text = event.target.value
      if (/[^\d.\s]/.test(text)) { event.target.value = formatted; return }
      const position = event.target.selectionStart ?? text.length
      caretDigits.current = text.slice(0, position).replace(/\D/g, '').length
      const next = text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
      if (next === value) {
        caretDigits.current = null
        event.target.value = formatted
      } else onValueChange(next)
    }} />
}
