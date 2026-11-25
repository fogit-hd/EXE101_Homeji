import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { getReferrals, quoteVoucher, type Voucher } from '../../api/referrals'
import { getErrorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/labels'
export type VoucherSelection = { id: string; discount: number; amount: number; pending: boolean }
type Props = {
 purpose: 'food' | 'vip'
 amount: number
 disabled?: boolean
 onChange: (selection: VoucherSelection | null) => void
 customCode?: { content: ReactNode; onDeselect: () => void }
}
const customCodeOption = 'custom-code'

export function VoucherPicker({ purpose, amount, disabled, onChange, customCode }: Props) {
 const [vouchers, setVouchers] = useState<Voucher[]>([])
 const [error, setError] = useState('')
 const [selected, setSelected] = useState('')
 const generation = useRef(0)
 const mounted = useRef(true)
 const id = useId()
 useEffect(() => { let active = true; mounted.current = true; void getReferrals().then(data => { if (active) setVouchers(data.vouchers.filter(v => v.purpose === purpose && !v.used && Date.parse(v.expiresAt) > Date.now())) }).catch(reason => { if (active) setError(getErrorMessage(reason, 'Chưa tải được voucher. Bạn vẫn có thể thanh toán nguyên giá.')) }); return () => { active = false; mounted.current = false } }, [purpose])
 const choose = async (value: string) => {
  const current = ++generation.current
  if (selected === customCodeOption && value !== customCodeOption) customCode?.onDeselect()
  setSelected(value); setError('')
  if (!value || value === customCodeOption) { onChange(null); return }
  onChange({ id: value, discount: 0, amount, pending: true })
  try { const result = await quoteVoucher(value, purpose, amount); if (mounted.current && current === generation.current) onChange({ id: value, discount: result.discount, amount, pending: false }) }
  catch (reason) { if (mounted.current && current === generation.current) { setError(getErrorMessage(reason)); setSelected(''); onChange(null) } }
 }
 return <div className="voucher-picker" data-glass-exclude>
  <label htmlFor={id}>Chọn voucher {purpose === 'food' ? 'đồ ăn' : 'Premium'}</label>
  <select id={id} className="form-select" value={selected} disabled={disabled} onChange={e => void choose(e.target.value)}>
   <option value="">Không dùng voucher</option>
   {customCode && <option value={customCodeOption}>Nhập mã giảm giá</option>}
   {vouchers.map(v => <option key={v.id} value={v.id} disabled={amount < v.minimumSpend}>Giảm {v.rate * 100}% tối đa {formatPrice(v.maximumDiscount)} · từ {formatPrice(v.minimumSpend)}</option>)}
  </select>
  {selected === customCodeOption && customCode ? customCode.content : <>
   {!vouchers.length && !error && <small>Chưa có voucher phù hợp. Nhận quà tại mục Mời bạn & voucher.</small>}
   {error && <p role="alert">{error}</p>}
  </>}
 </div>
}
