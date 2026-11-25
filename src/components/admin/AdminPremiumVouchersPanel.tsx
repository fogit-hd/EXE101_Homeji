import { useEffect, useRef, useState } from 'react'
import { getSubscriptionPackages, type SubscriptionPackage } from '../../api'
import { createPremiumVoucher } from '../../api/premiumVouchers'
import { SubscriptionTier } from '../../api/types'
import { getErrorMessage } from '../../lib/errors'

export function AdminPremiumVouchersPanel() {
  const [plans, setPlans] = useState<SubscriptionPackage[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [packageCode, setPackageCode] = useState('')
  const [code, setCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const saving = useRef(false)

  useEffect(() => {
    let active = true
    void getSubscriptionPackages()
      .then(packages => {
        if (active) setPlans(packages.filter(plan => plan.tier === SubscriptionTier.Premium && plan.price > 0))
      })
      .catch(error => {
        if (active) setLoadError(getErrorMessage(error, 'Chưa tải được danh sách gói Premium.'))
      })
    return () => { active = false }
  }, [loadAttempt])

  const save = async () => {
    if (saving.current || !packageCode) return
    const normalizedCode = code.trim()
    setError('')
    setMessage('')
    if (!/^[a-z0-9_-]{1,80}$/i.test(normalizedCode)) {
      setError('Mã voucher chỉ gồm chữ cái không dấu, chữ số, dấu gạch ngang hoặc gạch dưới.')
      return
    }
    saving.current = true
    setBusy(true)
    try {
      const voucher = await createPremiumVoucher({
        code: normalizedCode,
        packageCode,
        discountPercent: Number(discountPercent),
        expiresAt: expiry ? new Date(`${expiry}+07:00`).toISOString() : null,
      })
      const planName = plans?.find(plan => plan.code === voucher.packageCode)?.name ?? voucher.packageCode
      setMessage(`Đã tạo mã ${voucher.code} giảm ${voucher.discountPercent}% cho ${planName}.`)
      setCode('')
    } catch (error) {
      setError(getErrorMessage(error, 'Chưa tạo được voucher.'))
    } finally {
      saving.current = false
      setBusy(false)
    }
  }

  return <div className="admin-pricing">
    {loadError ? <p role="alert">
      {loadError} <button type="button" onClick={() => { setLoadError(''); setLoadAttempt(attempt => attempt + 1) }}>Thử lại</button>
    </p> : null}
    {plans === null && !loadError ? <p role="status">Đang tải danh sách gói…</p> : null}
    {plans?.length === 0 ? <p>Chưa có gói Premium có trả phí.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {plans?.length ? <form onSubmit={event => { event.preventDefault(); void save() }}>
      <fieldset disabled={busy}>
        <label>Gói áp dụng
          <select value={packageCode} onChange={event => setPackageCode(event.target.value)} required>
            <option value="">Chọn gói Premium</option>
            {plans.map(plan => <option key={plan.code} value={plan.code}>{plan.name} · {plan.durationDays} ngày</option>)}
          </select>
        </label>
        <label>Mã voucher
          <input type="text" required maxLength={80} value={code} autoCapitalize="none" spellCheck={false}
            onChange={event => setCode(event.target.value)} />
        </label>
        <label>Phần trăm giảm
          <input type="number" required min={1} max={99} value={discountPercent}
            onChange={event => setDiscountPercent(event.target.value)} />
        </label>
        <label>Hạn sử dụng (giờ Việt Nam, không bắt buộc)
          <input type="datetime-local" value={expiry} onChange={event => setExpiry(event.target.value)} />
        </label>
        <button type="submit">{busy ? 'Đang tạo…' : 'Tạo voucher'}</button>
      </fieldset>
    </form> : null}
  </div>
}
