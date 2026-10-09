import { useId, useState } from 'react'
import { calculateRentalCost, type RentalFee, type RentalFeeUnit } from '../../lib/rentalCost'
import { formatPrice } from '../../lib/labels'
import './RentalCostCalculator.css'

const emptyFee: RentalFee = { rate: null, unit: 'unknown', usage: null }
const amount = (value: string) => value.trim() === '' ? null : Number(value)

export function RentalCostCalculator({ rent, depositHint, occupantsHint = 1, monthlyCeiling, onConfirmMonthly, onInvalidate }: {
  rent: number; depositHint?: number; occupantsHint?: number; monthlyCeiling?: number | null
  onConfirmMonthly?: (monthly: number) => void; onInvalidate?: () => void
}) {
  const id = useId()
  const [people, setPeople] = useState(occupantsHint)
  const [electricity, setElectricity] = useState<RentalFee>(emptyFee)
  const [water, setWater] = useState<RentalFee>(emptyFee)
  const [internet, setInternet] = useState<number | null>(null)
  const [other, setOther] = useState<number | null>(null)
  const [deposit, setDeposit] = useState<number | null>(null)
  const [initialFees, setInitialFees] = useState<number | null>(null)
  let result: ReturnType<typeof calculateRentalCost> | null = null
  try {
    result = calculateRentalCost({ rent, occupants: people, electricity, water, internet, otherMonthly: other, deposit, initialFees })
  } catch { /* Invalid intermediate input stays visible for correction. */ }
  const update = <T,>(setter: (value: T) => void, value: T) => { onInvalidate?.(); setter(value) }
  const feeFields = (label: string, fee: RentalFee, setFee: (next: RentalFee) => void) => <fieldset>
    <legend>{label}</legend>
    <label htmlFor={`${id}-${label}-unit`}>Đơn vị đã hỏi chủ phòng</label>
    <select id={`${id}-${label}-unit`} value={fee.unit} onChange={event => update(setFee, { ...fee, unit: event.target.value as RentalFeeUnit })}>
      <option value="unknown">Chưa biết đơn vị</option><option value="monthly">VND / phòng / tháng</option>
      <option value="person">VND / người / tháng</option><option value="usage">{label === 'Điện' ? 'VND / kWh' : 'VND / m³'}</option>
    </select>
    <label htmlFor={`${id}-${label}-rate`}>Đơn giá (VND)</label>
    <input id={`${id}-${label}-rate`} type="number" min="0" max="1000000000" value={fee.rate ?? ''} onChange={event => update(setFee, { ...fee, rate: amount(event.target.value) })} />
    {fee.unit === 'usage' ? <><label htmlFor={`${id}-${label}-usage`}>{label === 'Điện' ? 'kWh' : 'm³'} dùng mỗi tháng</label>
      <input id={`${id}-${label}-usage`} type="number" min="0" max="100000" value={fee.usage ?? ''} onChange={event => update(setFee, { ...fee, usage: amount(event.target.value) })} /></> : null}
  </fieldset>
  return <details className="rental-cost"><summary>Ước tính chi phí theo kịch bản của bạn</summary>
    <p>Giá thuê lấy từ tin. Nhập các khoản bạn đã hỏi chủ phòng; nhập 0 khi đã xác nhận miễn phí. Bỏ trống giữ trạng thái chưa biết.</p>
    <label htmlFor={`${id}-people`}>Số người</label><input id={`${id}-people`} type="number" min="1" max="20" value={people} onChange={event => update(setPeople, Number(event.target.value))} />
    {feeFields('Điện', electricity, setElectricity)}{feeFields('Nước', water, setWater)}
    {([
      ['internet', 'Internet / phòng / tháng (VND)', internet, setInternet],
      ['other', 'Phí khác / phòng / tháng (VND)', other, setOther],
      ['deposit', `Tiền cọc đã xác nhận (VND)${depositHint && depositHint > 0 ? ` · tin ghi ${formatPrice(depositHint)}` : ''}`, deposit, setDeposit],
      ['initial', 'Phí ban đầu khác đã xác nhận (VND)', initialFees, setInitialFees],
    ] as const).map(([key, label, value, setter]) => <div key={key}><label htmlFor={`${id}-${key}`}>{label}</label>
      <input id={`${id}-${key}`} type="number" min="0" max="1000000000" value={value ?? ''} onChange={event => update(setter, amount(event.target.value))} /></div>)}
    <output aria-live="polite">{result ? <>
      <p>Hằng tháng: <strong>{result.monthly == null ? `${formatPrice(result.knownMonthly)} đã biết + khoản chưa có thông tin` : formatPrice(result.monthly)}</strong></p>
      <p>Ban đầu (cọc + thuê đầu kỳ + phí ban đầu): <strong>{result.initial == null ? 'Chưa có đủ thông tin' : formatPrice(result.initial)}</strong></p>
    </> : <p role="alert">Kiểm tra số người (1–20), các khoản tiền (0–1 tỷ VND) và lượng dùng (0–100.000).</p>}</output>
    {monthlyCeiling != null && result?.monthly != null ? <p>{result.monthly <= monthlyCeiling ? 'Trong ngân sách theo kịch bản này.' : 'Vượt ngân sách theo kịch bản này.'}</p> : null}
    {onConfirmMonthly ? <button type="button" disabled={result?.monthly == null} onClick={() => {
      if (result?.monthly != null) onConfirmMonthly(result.monthly)
    }}>Xác nhận kịch bản chi phí của phòng này</button> : null}
    <small>Ước tính từ kịch bản bạn nhập; có thể còn khoản chưa được cung cấp, chưa phải báo giá chính thức.</small>
  </details>
}
