import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  WalletTransactionKind,
  WalletWithdrawalStatus,
  type Wallet,
  type WalletTransaction,
  type WalletWithdrawal,
} from '../../../api/types'
import { mapSectionUrl } from '../../../lib/mapDeepLinks'
import {
  formatAvailableBalance,
  formatWalletAmount,
  formatWalletLedgerTime,
  formatWalletSigned,
  historyCutoff,
  type DepositReturn,
  type WalletTabId,
} from '../../../lib/walletMoney'
import { FOOD_ASSETS } from '../food/foodAssets'
import { WALLET_ASSETS } from './walletAssets'
import './WalletPage.css'

export type DepositMethod = 'momo' | 'payos'

const QUICK_AMOUNTS = [100_000, 200_000, 500_000] as const
const TABS: { id: WalletTabId; label: string; icon: string; idle: string }[] = [
  { id: 'deposit', label: 'Nạp tiền', icon: WALLET_ASSETS.plus, idle: WALLET_ASSETS.plusMuted },
  { id: 'withdraw', label: 'Rút tiền', icon: WALLET_ASSETS.arrowActive, idle: WALLET_ASSETS.arrowDown },
  { id: 'history', label: 'Lịch sử', icon: WALLET_ASSETS.listActive, idle: WALLET_ASSETS.list },
]

const KIND_LABEL: Record<number, string> = {
  [WalletTransactionKind.TopUp]: 'Nạp tiền',
  [WalletTransactionKind.Purchase]: 'Thanh toán đơn',
  [WalletTransactionKind.Refund]: 'Hoàn tiền',
  [WalletTransactionKind.SaleProceeds]: 'Tiền bán món',
  [WalletTransactionKind.PlatformFee]: 'Phí nền tảng',
  [WalletTransactionKind.LegacyServicePurchase]: 'Dịch vụ trước đây',
  [WalletTransactionKind.Withdrawal]: 'Rút tiền',
  [WalletTransactionKind.WithdrawalRefund]: 'Hoàn tiền rút',
}

type KindFilter = 'all' | 'deposit' | 'withdraw' | 'purchase' | 'refund' | 'sale'
type RangeFilter = '30' | '7' | 'all'
type StatusFilter = 'all' | 'success' | 'pending' | 'failed'
type RowStatus = 'success' | 'pending' | 'failed'

type LedgerRow = {
  id: string
  kind: number
  title: string
  detail: string
  time: string
  reference: string
  status: RowStatus
  amount: number
  balanceAfter: number | null
}

type ActionResult = { ok: true } | { ok: false; message: string }

type Props = {
  tab: WalletTabId
  wallet: Wallet | null
  transactions: WalletTransaction[]
  withdrawals: WalletWithdrawal[]
  withdrawalsUnavailable: boolean
  loading: boolean
  busy: boolean
  depositReturn: DepositReturn
  onTabChange: (tab: WalletTabId) => void
  onDeposit: (amount: number, method: DepositMethod) => Promise<ActionResult>
  onWithdraw: (input: {
    amount: number
    bankName: string
    accountNumber: string
    accountHolder: string
  }) => Promise<ActionResult>
}

function Icon({ src, size = 16 }: { src: string; size?: number }) {
  return <img src={src} alt="" width={size} height={size} />
}

function kindIcon(kind: number): string {
  if (kind === WalletTransactionKind.Refund || kind === WalletTransactionKind.WithdrawalRefund) {
    return WALLET_ASSETS.refund
  }
  if (kind === WalletTransactionKind.Purchase || kind === WalletTransactionKind.LegacyServicePurchase) {
    return WALLET_ASSETS.bag
  }
  if (kind === WalletTransactionKind.SaleProceeds) return FOOD_ASSETS.icons.chefHat
  if (kind === WalletTransactionKind.Withdrawal) return WALLET_ASSETS.arrowDown
  if (kind === WalletTransactionKind.TopUp) return WALLET_ASSETS.plus
  return WALLET_ASSETS.banknote
}

function statusLabel(status: RowStatus): string {
  if (status === 'pending') return 'Đang xử lý'
  if (status === 'failed') return 'Thất bại'
  return 'Thành công'
}

function withdrawalStatus(status: number): RowStatus {
  if (status === WalletWithdrawalStatus.Pending) return 'pending'
  if (status === WalletWithdrawalStatus.Rejected) return 'failed'
  return 'success'
}

function matchesKind(kind: number, filter: KindFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'deposit') return kind === WalletTransactionKind.TopUp
  if (filter === 'withdraw') return kind === WalletTransactionKind.Withdrawal
  if (filter === 'purchase') {
    return kind === WalletTransactionKind.Purchase
      || kind === WalletTransactionKind.LegacyServicePurchase
      || kind === WalletTransactionKind.PlatformFee
  }
  if (filter === 'refund') {
    return kind === WalletTransactionKind.Refund || kind === WalletTransactionKind.WithdrawalRefund
  }
  return kind === WalletTransactionKind.SaleProceeds
}

function buildLedger(transactions: WalletTransaction[], withdrawals: WalletWithdrawal[]): LedgerRow[] {
  const withdrawalById = new Map(withdrawals.map((item) => [item.id, item]))
  const linked = new Set<string>()
  const rows: LedgerRow[] = transactions.map((transaction) => {
    const withdrawal = withdrawalById.get(transaction.referenceId)
    if (withdrawal) linked.add(withdrawal.id)
    return {
      id: transaction.id,
      kind: transaction.kind,
      title: KIND_LABEL[transaction.kind] ?? transaction.description,
      detail: transaction.description,
      time: transaction.createdAt,
      reference: transaction.referenceId || transaction.id,
      status: withdrawal ? withdrawalStatus(withdrawal.status) : 'success',
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
    }
  })

  for (const withdrawal of withdrawals) {
    if (linked.has(withdrawal.id)) continue
    if (withdrawal.status === WalletWithdrawalStatus.Completed) continue
    rows.push({
      id: `withdrawal:${withdrawal.id}`,
      kind: WalletTransactionKind.Withdrawal,
      title: 'Rút tiền',
      detail: `${withdrawal.bankName} · •••• ${withdrawal.accountNumber.slice(-4)}`,
      time: withdrawal.createdAt,
      reference: withdrawal.id,
      status: withdrawalStatus(withdrawal.status),
      amount: -Math.abs(withdrawal.amount),
      balanceAfter: null,
    })
  }

  return rows.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

export function WalletPage({
  tab,
  wallet,
  transactions,
  withdrawals,
  withdrawalsUnavailable,
  loading,
  busy,
  depositReturn,
  onTabChange,
  onDeposit,
  onWithdraw,
}: Props) {
  const balance = wallet?.balance
  const reserve = wallet?.minimumWithdrawalReserve ?? 20_000
  const minTopUp = wallet?.minimumTopUp
  const maxTopUp = wallet?.maximumTopUp
  const verifiedAccount = withdrawals.find((item) => item.status === WalletWithdrawalStatus.Completed) ?? null

  return (
    <div className="wallet-page">
      <WalletSummary wallet={wallet} loading={loading} />
      <WalletTabNavigation tab={tab} onTabChange={onTabChange} />
      {tab === 'deposit' ? (
        <DepositPanel
          wallet={wallet}
          balance={balance}
          minTopUp={minTopUp}
          maxTopUp={maxTopUp}
          transactions={transactions}
          loading={loading}
          busy={busy}
          depositReturn={depositReturn}
          onDeposit={onDeposit}
        />
      ) : null}
      {tab === 'withdraw' ? (
        <WithdrawPanel
          key={verifiedAccount?.id ?? 'no-verified-account'}
          balance={balance}
          reserve={reserve}
          verifiedAccount={verifiedAccount}
          withdrawalsUnavailable={withdrawalsUnavailable}
          loading={loading}
          busy={busy}
          onWithdraw={onWithdraw}
        />
      ) : null}
      {tab === 'history' ? (
        <HistoryPanel
          transactions={transactions}
          withdrawals={withdrawals}
          walletUpdatedAt={wallet?.updatedAt ?? null}
          loading={loading}
        />
      ) : null}
    </div>
  )
}

function WalletSummary({ wallet, loading }: { wallet: Wallet | null; loading: boolean }) {
  const missing = !wallet && !loading
  return (
    <section className="wallet-summary" aria-label="Ví Homeji">
      <div className="wallet-summary__available">
        <div className="wallet-summary__identity">
          <span className="wallet-summary__label">
            <span className="wallet-summary__icon">
              <Icon src={WALLET_ASSETS.walletCards} size={15} />
            </span>
            Số dư khả dụng
          </span>
          {wallet?.isActivated ? (
            <span className="wallet-summary__badge">
              <Icon src={WALLET_ASSETS.shield} size={13} />
              Đã bảo vệ
            </span>
          ) : null}
        </div>
        <p className="wallet-summary__balance">
          {wallet ? formatAvailableBalance(wallet.balance) : loading ? 'Đang tải…' : 'Chưa có số dư'}
        </p>
        <p className="wallet-summary__note">
          {wallet
            ? 'Sẵn sàng để mua món ngon hoặc rút về ngân hàng'
            : missing
              ? 'Không đọc được số dư từ ví.'
              : 'Đang lấy số dư từ ví Homeji.'}
        </p>
      </div>
      <div className="wallet-summary__statement">
        <div className="wallet-summary__heading">
          <h2>Tóm tắt dòng tiền</h2>
          <span>Tất cả thời gian</span>
        </div>
        <dl className="wallet-summary__metrics">
          <Metric label="Đã nạp" value={wallet ? formatWalletAmount(wallet.totalDeposited) : null} />
          <Metric label="Đã mua" value={wallet ? formatWalletAmount(wallet.totalSpent) : null} />
          <Metric label="Đã kiếm" value={wallet ? formatWalletAmount(wallet.totalEarned) : null} earned />
        </dl>
      </div>
    </section>
  )
}

function Metric({ label, value, earned = false }: { label: string; value: string | null; earned?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={earned && value ? 'is-earned' : undefined}>{value ?? '—'}</dd>
    </div>
  )
}

function WalletTabNavigation({
  tab,
  onTabChange,
}: {
  tab: WalletTabId
  onTabChange: (tab: WalletTabId) => void
}) {
  return (
    <div
      className="wallet-tabs"
      role="tablist"
      aria-label="Quản lý số dư"
      onKeyDown={(event) => {
        const index = TABS.findIndex((item) => item.id === tab)
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
        event.preventDefault()
        const delta = event.key === 'ArrowRight' ? 1 : -1
        const next = TABS[(index + delta + TABS.length) % TABS.length]
        onTabChange(next.id)
        document.getElementById(`wallet-tab-${next.id}`)?.focus()
      }}
    >
      {TABS.map((item) => (
        <button
          key={item.id}
          id={`wallet-tab-${item.id}`}
          type="button"
          role="tab"
          aria-selected={tab === item.id}
          aria-controls={`wallet-panel-${item.id}`}
          tabIndex={tab === item.id ? 0 : -1}
          className={tab === item.id ? 'is-active' : ''}
          onClick={() => onTabChange(item.id)}
        >
          <Icon src={tab === item.id ? item.icon : item.idle} />
          {item.label}
        </button>
      ))}
    </div>
  )
}

function DepositPanel({
  wallet,
  balance,
  minTopUp,
  maxTopUp,
  transactions,
  loading,
  busy,
  depositReturn,
  onDeposit,
}: {
  wallet: Wallet | null
  balance: number | undefined
  minTopUp: number | undefined
  maxTopUp: number | undefined
  transactions: WalletTransaction[]
  loading: boolean
  busy: boolean
  depositReturn: DepositReturn
  onDeposit: Props['onDeposit']
}) {
  const [amountText, setAmountText] = useState('200000')
  const [method, setMethod] = useState<DepositMethod | ''>('momo')
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'idle' | 'processing' | 'failed'>('idle')

  const amount = Number(amountText)
  const recent = transactions.find((item) => item.kind === WalletTransactionKind.TopUp) ?? transactions[0] ?? null
  const gatewayPhase = depositReturn === 'none' ? phase : depositReturn

  const submit = async () => {
    if (!wallet || minTopUp == null || maxTopUp == null) {
      setError('Chưa có hạn mức nạp từ ví. Hãy tải lại trước khi nạp.')
      return
    }
    if (!Number.isInteger(amount) || amount < minTopUp || amount > maxTopUp) {
      setError(`Nhập số nguyên từ ${formatWalletAmount(minTopUp)} đến ${formatWalletAmount(maxTopUp)}.`)
      return
    }
    if (method !== 'momo' && method !== 'payos') {
      setError('Chọn MoMo hoặc PayOS.')
      return
    }
    setError('')
    const result = await onDeposit(amount, method)
    if (!result.ok) {
      setPhase('failed')
      setError(result.message)
      return
    }
    setPhase('processing')
  }

  const shownPhase = busy ? 'submitting' : gatewayPhase

  return (
    <div className="wallet-split" id="wallet-panel-deposit" role="tabpanel" aria-labelledby="wallet-tab-deposit">
      <section className="wallet-card">
        <header className="wallet-card__head">
          <p className="wallet-card__eyebrow">Nạp vào ví</p>
          <h2>Chọn một khoản vừa đủ cho những bữa ngon sắp tới.</h2>
          <p>Số tiền sẽ được chuyển qua cổng thanh toán bảo mật trước khi cộng vào ví Homeji.</p>
        </header>

        <fieldset className="wallet-field">
          <legend>Chọn nhanh</legend>
          <div className="wallet-amounts">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={amount === value ? 'is-active' : ''}
                aria-pressed={amount === value}
                onClick={() => {
                  setAmountText(String(value))
                  setError('')
                }}
              >
                {formatWalletAmount(value)}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="wallet-field">
          <span>Hoặc nhập số tiền khác</span>
          <span className="wallet-input">
            <Icon src={WALLET_ASSETS.banknote} />
            <input
              inputMode="numeric"
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value.replace(/[^\d]/g, ''))
                setError('')
              }}
              aria-invalid={Boolean(error)}
              aria-describedby="wallet-deposit-hint"
            />
          </span>
          <small id="wallet-deposit-hint">
            {minTopUp != null && maxTopUp != null
              ? `Tối thiểu ${formatWalletAmount(minTopUp)} · Tối đa ${formatWalletAmount(maxTopUp)} mỗi lần`
              : 'Hạn mức nạp sẽ hiện khi ví tải xong.'}
          </small>
        </label>

        <fieldset className="wallet-field">
          <legend>Phương thức thanh toán</legend>
          <div className="wallet-methods">
            <button
              type="button"
              className={method === 'momo' ? 'is-active' : ''}
              aria-pressed={method === 'momo'}
              onClick={() => setMethod('momo')}
            >
              <span className="wallet-methods__icon"><Icon src={WALLET_ASSETS.phone} size={20} /></span>
              <span>
                <strong>MoMo <em>Đề xuất</em></strong>
                <small>Mở ứng dụng để xác nhận</small>
              </span>
              <span className="wallet-radio" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={method === 'payos' ? 'is-active' : ''}
              aria-pressed={method === 'payos'}
              onClick={() => setMethod('payos')}
            >
              <span className="wallet-methods__icon"><Icon src={WALLET_ASSETS.qr} size={20} /></span>
              <span>
                <strong>PayOS</strong>
                <small>QR ngân hàng · Miễn phí</small>
              </span>
              <span className="wallet-radio" aria-hidden="true" />
            </button>
          </div>
        </fieldset>

        <div className="wallet-notice wallet-notice--warm">
          <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.webhook} /></span>
          <span>
            <strong>Chỉ ghi nhận sau khi xác thực</strong>
            <small>Tiền chỉ được cộng vào số dư khi Homeji nhận webhook thành công từ đối tác thanh toán. Không đóng trang xác nhận quá sớm.</small>
          </span>
        </div>

        {shownPhase === 'processing' ? (
          <p className="wallet-status is-processing" role="status">
            Đang chờ webhook. Số dư trên trang này chỉ đổi sau khi ví được tải lại từ máy chủ, không cộng theo trang chuyển hướng.
          </p>
        ) : null}
        {shownPhase === 'failed' || error ? (
          <p className="wallet-status is-failed" role="alert">{error || 'Không tạo được giao dịch nạp.'}</p>
        ) : null}

        <footer className="wallet-submit">
          <div>
            <span>Sẽ nạp vào ví</span>
            <strong>{Number.isFinite(amount) && amount > 0 ? formatWalletAmount(amount) : '—'}</strong>
          </div>
          <button type="button" disabled={busy || !wallet || loading} onClick={() => void submit()}>
            {busy ? 'Đang tạo giao dịch…' : `Nạp ${Number.isFinite(amount) && amount > 0 ? formatWalletAmount(amount) : ''}`.trim()}
            <Icon src={WALLET_ASSETS.arrowUpRight} size={17} />
          </button>
        </footer>
        <p className="wallet-aside-note">Số dư khả dụng hiện tại: {balance == null ? '—' : formatWalletAmount(balance)}</p>
      </section>

      <aside className="wallet-rail" aria-label="Giao dịch gần nhất">
        <h2>Giao dịch gần nhất</h2>
        {recent ? (
          <article className="wallet-recent">
            <header>
              <span><Icon src={WALLET_ASSETS.check} size={17} />{KIND_LABEL[recent.kind] ?? recent.description}</span>
              <b>Thành công</b>
            </header>
            <p className={recent.amount >= 0 ? 'is-in' : 'is-out'}>
              <span className="sr-only">{recent.amount >= 0 ? 'Tiền vào' : 'Tiền ra'}</span>
              {formatWalletSigned(recent.amount)}
            </p>
            <dl>
              <div><dt>Thời gian</dt><dd>{formatWalletLedgerTime(recent.createdAt)}</dd></div>
              <div><dt>Mã tham chiếu</dt><dd>{recent.referenceId || recent.id}</dd></div>
            </dl>
          </article>
        ) : (
          <WalletEmptyState title="Chưa có giao dịch gần nhất" detail="Khi ví ghi sổ, giao dịch mới sẽ hiện ở đây." />
        )}
        <h3>Nạp tiền an toàn</h3>
        <div className="wallet-notice wallet-notice--mint">
          <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.shield} /></span>
          <span>
            <strong>Xác nhận đúng tên Homeji</strong>
            <small>Không chuyển khoản tới tài khoản cá nhân hoặc mã QR được gửi qua tin nhắn.</small>
          </span>
        </div>
        <div className="wallet-notice wallet-notice--paper">
          <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.receipt} /></span>
          <span>
            <strong>Giữ mã tham chiếu</strong>
            <small>Dùng mã giao dịch để đối soát nếu số dư chưa cập nhật sau 5 phút.</small>
          </span>
        </div>
        <Link className="wallet-support" to={mapSectionUrl('messages')}>
          Cần hỗ trợ giao dịch?
          <Icon src={WALLET_ASSETS.arrowUpRight} size={15} />
        </Link>
      </aside>
    </div>
  )
}

function WithdrawPanel({
  balance,
  reserve,
  verifiedAccount,
  withdrawalsUnavailable,
  loading,
  busy,
  onWithdraw,
}: {
  balance: number | undefined
  reserve: number
  verifiedAccount: WalletWithdrawal | null
  withdrawalsUnavailable: boolean
  loading: boolean
  busy: boolean
  onWithdraw: Props['onWithdraw']
}) {
  const [bankName, setBankName] = useState(verifiedAccount?.bankName ?? '')
  const [accountNumber, setAccountNumber] = useState(verifiedAccount?.accountNumber ?? '')
  const [accountHolder, setAccountHolder] = useState(verifiedAccount?.accountHolder ?? '')
  const [amountText, setAmountText] = useState('')
  const [fieldError, setFieldError] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [sent, setSent] = useState(false)

  const amount = Number(amountText)
  const fee = 0
  const remaining = balance == null || !Number.isInteger(amount) ? null : balance - amount
  const spendable = balance == null ? null : Math.max(0, balance - reserve)

  const submit = async () => {
    const next: Record<string, string> = {}
    if (!bankName.trim()) next.bankName = 'Nhập tên ngân hàng.'
    if (!/^\d{6,40}$/.test(accountNumber.trim())) next.accountNumber = 'Số tài khoản chỉ gồm chữ số.'
    if (!accountHolder.trim()) next.accountHolder = 'Nhập tên chủ tài khoản.'
    if (!Number.isInteger(amount) || amount <= 0) next.amount = 'Số tiền rút phải là số nguyên dương.'
    else if (balance == null) next.amount = 'Chưa có số dư để kiểm tra hạn mức.'
    else if (balance - amount < reserve) {
      next.amount = `Sau khi rút, ví phải còn ít nhất ${formatWalletAmount(reserve)}. Quy tắc này được kiểm trên form; máy chủ cũng từ chối nếu vi phạm.`
    }
    setFieldError(next)
    if (Object.keys(next).length > 0) {
      setFormError('Kiểm tra lại các trường được đánh dấu.')
      setSent(false)
      return
    }
    setFormError('')
    const result = await onWithdraw({
      amount,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim(),
    })
    if (!result.ok) {
      setSent(false)
      setFormError(result.message)
      return
    }
    setSent(true)
    setAmountText('')
  }

  return (
    <div className="wallet-split" id="wallet-panel-withdraw" role="tabpanel" aria-labelledby="wallet-tab-withdraw">
      <section className="wallet-card">
        <header className="wallet-card__head">
          <p className="wallet-card__eyebrow">Rút về ngân hàng</p>
          <h2>Đưa tiền từ căn bếp về đúng tài khoản của bạn.</h2>
          <p>Thông tin người nhận phải trùng với hồ sơ đã từng rút thành công, nếu ví đã có tài khoản xác minh.</p>
        </header>

        {withdrawalsUnavailable ? (
          <p className="wallet-status is-failed" role="status">
            Rút tiền đang tạm khóa vì danh sách yêu cầu chưa tải được. Các chức năng số dư khác vẫn hoạt động.
          </p>
        ) : null}

        <div className="wallet-grid">
          <label className="wallet-field">
            <span>Tên ngân hàng</span>
            <span className="wallet-input">
              <Icon src={WALLET_ASSETS.landmark} />
              <input
                value={bankName}
                maxLength={120}
                aria-invalid={Boolean(fieldError.bankName)}
                onChange={(event) => setBankName(event.target.value)}
              />
            </span>
            {fieldError.bankName ? <small className="is-error">{fieldError.bankName}</small> : null}
          </label>
          <label className="wallet-field">
            <span>Số tài khoản</span>
            <span className="wallet-input">
              <Icon src={WALLET_ASSETS.card} />
              <input
                inputMode="numeric"
                value={accountNumber}
                maxLength={40}
                aria-invalid={Boolean(fieldError.accountNumber)}
                onChange={(event) => setAccountNumber(event.target.value.replace(/[^\d]/g, ''))}
              />
            </span>
            {fieldError.accountNumber ? <small className="is-error">{fieldError.accountNumber}</small> : null}
          </label>
          <label className="wallet-field">
            <span>Tên chủ tài khoản</span>
            <span className="wallet-input">
              <Icon src={WALLET_ASSETS.userCheck} />
              <input
                value={accountHolder}
                maxLength={120}
                aria-invalid={Boolean(fieldError.accountHolder)}
                onChange={(event) => setAccountHolder(event.target.value.toUpperCase())}
              />
            </span>
            {fieldError.accountHolder ? <small className="is-error">{fieldError.accountHolder}</small> : null}
          </label>
          <label className="wallet-field">
            <span>Số tiền muốn rút</span>
            <span className="wallet-input">
              <Icon src={WALLET_ASSETS.banknote} />
              <input
                inputMode="numeric"
                value={amountText}
                aria-invalid={Boolean(fieldError.amount)}
                onChange={(event) => setAmountText(event.target.value.replace(/[^\d]/g, ''))}
              />
            </span>
            <small className={fieldError.amount ? 'is-error' : undefined}>
              {fieldError.amount ?? (spendable == null ? 'Chưa có số khả dụng.' : `Khả dụng để rút: ${formatWalletAmount(spendable)}`)}
            </small>
          </label>
        </div>

        <div className="wallet-condition-row">
          <div className="wallet-notice wallet-notice--warm">
            <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.dollar} /></span>
            <span>
              <strong>Giữ lại tối thiểu {formatWalletAmount(reserve)}</strong>
              <small>Sau giao dịch, ví phải còn ít nhất {formatWalletAmount(reserve)} để xử lý điều chỉnh hoặc hoàn tiền phát sinh.</small>
            </span>
          </div>
          <div className="wallet-notice wallet-notice--paper">
            <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.clock} /></span>
            <span>
              <strong>Xử lý trong 1–2 ngày làm việc</strong>
              <small>Yêu cầu trước 15:00 thường được đối soát trong ngày; cuối tuần sẽ chuyển sang ngày làm việc kế tiếp.</small>
            </span>
          </div>
        </div>

        {formError ? <p className="wallet-status is-failed" role="alert">{formError}</p> : null}
        {sent ? <p className="wallet-status is-processing" role="status">Đã gửi yêu cầu. Số dư cập nhật theo phản hồi của ví, không theo ước tính trên form.</p> : null}

        <footer className="wallet-submit">
          <div>
            <span>Số dư dự kiến còn lại</span>
            <strong>{remaining == null || remaining < 0 ? '—' : formatWalletAmount(remaining)}</strong>
          </div>
          <button type="button" disabled={busy || loading || withdrawalsUnavailable || balance == null} onClick={() => void submit()}>
            {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu rút tiền'}
            <Icon src={WALLET_ASSETS.send} size={17} />
          </button>
        </footer>
      </section>

      <aside className="wallet-rail" aria-label="Kiểm tra trước khi gửi">
        <h2>Kiểm tra trước khi gửi</h2>
        {verifiedAccount ? (
          <article className="wallet-verified">
            <span className="wallet-methods__icon"><Icon src={WALLET_ASSETS.landmark} size={20} /></span>
            <span>
              <strong>{verifiedAccount.bankName} <em>Đã xác minh</em></strong>
              <small>•••• {verifiedAccount.accountNumber.slice(-4)} · {verifiedAccount.accountHolder}</small>
            </span>
            <Icon src={WALLET_ASSETS.check} size={18} />
          </article>
        ) : (
          <WalletEmptyState title="Chưa có tài khoản đã xác minh" detail="Thẻ này hiện khi đã có một lệnh rút hoàn tất." />
        )}
        <h3>Tóm tắt giao dịch</h3>
        <dl className="wallet-lines">
          <div><dt>Từ ví Homeji</dt><dd>{balance == null ? '—' : formatWalletAmount(balance)}</dd></div>
          <div><dt>Số tiền rút</dt><dd className="is-out">{Number.isInteger(amount) && amount > 0 ? formatWalletSigned(-amount) : '—'}</dd></div>
          <div><dt>Phí xử lý</dt><dd>{formatWalletAmount(fee)}</dd></div>
          <div className="is-total"><dt>Ngân hàng nhận</dt><dd>{Number.isInteger(amount) && amount > 0 ? formatWalletAmount(amount - fee) : '—'}</dd></div>
        </dl>
        <p className="wallet-fee-note">API rút tiền không trả phí riêng. Form đang tính phí xử lý 0 ₫ và số nhận bằng số rút.</p>
        <h3>Tiến trình dự kiến</h3>
        <ol className="wallet-timeline">
          <li><span>1</span><b>Gửi yêu cầu</b><small>Hôm nay</small></li>
          <li><span>2</span><b>Homeji đối soát</b><small>Trong 24 giờ</small></li>
          <li><span>3</span><b>Ngân hàng ghi có</b><small>1–2 ngày làm việc</small></li>
        </ol>
        <div className="wallet-notice wallet-notice--mint">
          <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.lock} /></span>
          <span>
            <strong>Bảo mật tài khoản nhận</strong>
            <small>Homeji không yêu cầu mã OTP để duyệt lệnh rút.</small>
          </span>
        </div>
        <p className="wallet-policy">Bằng việc gửi yêu cầu, bạn xác nhận thông tin trên là chính xác và đồng ý với quy trình đối soát của Homeji.</p>
      </aside>
    </div>
  )
}

function HistoryPanel({
  transactions,
  withdrawals,
  walletUpdatedAt,
  loading,
}: {
  transactions: WalletTransaction[]
  withdrawals: WalletWithdrawal[]
  walletUpdatedAt: string | null
  loading: boolean
}) {
  const [kind, setKind] = useState<KindFilter>('all')
  const [range, setRange] = useState<RangeFilter>('30')
  const [status, setStatus] = useState<StatusFilter>('all')
  const rows = useMemo(() => buildLedger(transactions, withdrawals), [transactions, withdrawals])
  const filtered = useMemo(() => {
    const cutoff = historyCutoff(range)
    return rows.filter((row) => {
      if (!matchesKind(row.kind, kind)) return false
      if (status !== 'all' && row.status !== status) return false
      if (cutoff != null && new Date(row.time).getTime() < cutoff) return false
      return true
    })
  }, [rows, kind, range, status])

  const inflow = filtered.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0)
  const outflow = filtered.filter((row) => row.amount < 0).reduce((sum, row) => sum + Math.abs(row.amount), 0)
  const buckets = [
    { label: 'Nạp tiền', amount: sumKind(filtered, (row) => row.kind === WalletTransactionKind.TopUp && row.amount > 0) },
    { label: 'Tiền bán món', amount: sumKind(filtered, (row) => row.kind === WalletTransactionKind.SaleProceeds) },
    { label: 'Hoàn tiền', amount: sumKind(filtered, (row) => row.kind === WalletTransactionKind.Refund || row.kind === WalletTransactionKind.WithdrawalRefund) },
    { label: 'Mua món & rút tiền', amount: sumKind(filtered, (row) => row.amount < 0 && row.kind !== WalletTransactionKind.Refund) },
  ]
  const maxBucket = Math.max(1, ...buckets.map((item) => Math.abs(item.amount)))

  return (
    <div className="wallet-split" id="wallet-panel-history" role="tabpanel" aria-labelledby="wallet-tab-history">
      <section className="wallet-card">
        <header className="wallet-card__head">
          <p className="wallet-card__eyebrow">Sổ giao dịch</p>
          <h2>Mỗi thay đổi đều có dấu vết rõ ràng.</h2>
          <p>Theo dõi tiền vào, tiền ra và số dư sau từng giao dịch.</p>
        </header>
        <div className="wallet-filters">
          <Filter label="Loại giao dịch" icon={WALLET_ASSETS.swap} value={kind} onChange={(value) => setKind(value as KindFilter)}>
            <option value="all">Tất cả giao dịch</option>
            <option value="deposit">Nạp tiền</option>
            <option value="withdraw">Rút tiền</option>
            <option value="purchase">Thanh toán đơn</option>
            <option value="refund">Hoàn tiền</option>
            <option value="sale">Tiền bán món</option>
          </Filter>
          <Filter label="Khoảng thời gian" icon={WALLET_ASSETS.calendar} value={range} onChange={(value) => setRange(value as RangeFilter)}>
            <option value="30">30 ngày gần nhất</option>
            <option value="7">7 ngày gần nhất</option>
            <option value="all">Tất cả thời gian</option>
          </Filter>
          <Filter label="Trạng thái" icon={WALLET_ASSETS.checkBig} value={status} onChange={(value) => setStatus(value as StatusFilter)}>
            <option value="all">Mọi trạng thái</option>
            <option value="success">Thành công</option>
            <option value="pending">Đang xử lý</option>
            <option value="failed">Thất bại</option>
          </Filter>
        </div>

        {loading && rows.length === 0 ? (
          <p className="wallet-status is-processing" role="status">Đang tải sổ giao dịch…</p>
        ) : filtered.length === 0 ? (
          <WalletEmptyState title="Không có giao dịch trong bộ lọc này" detail="Đổi loại, thời gian hoặc trạng thái. Không có dòng giả khi ví trả về danh sách trống." />
        ) : (
          <>
            <div className="wallet-table-wrap">
              <table className="wallet-table">
                <thead>
                  <tr>
                    <th>Giao dịch</th>
                    <th>Thời gian</th>
                    <th>Mã tham chiếu</th>
                    <th>Trạng thái</th>
                    <th>Số tiền</th>
                    <th>Số dư sau GD</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="wallet-tx">
                          <span className="wallet-tx__icon"><Icon src={kindIcon(row.kind)} /></span>
                          <span>
                            <strong>{row.title}</strong>
                            <small>{row.detail}</small>
                          </span>
                        </span>
                      </td>
                      <td>{formatWalletLedgerTime(row.time)}</td>
                      <td>{row.reference}</td>
                      <td><span className={`wallet-pill is-${row.status}`}>{statusLabel(row.status)}</span></td>
                      <td className={row.amount >= 0 ? 'is-in' : 'is-out'}>
                        <span className="sr-only">{row.amount >= 0 ? 'Tiền vào' : 'Tiền ra'}</span>
                        {formatWalletSigned(row.amount)}
                      </td>
                      <td>{row.balanceAfter == null ? '—' : formatWalletAmount(row.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="wallet-cards">
              {filtered.map((row) => (
                <li key={`card-${row.id}`}>
                  <span className="wallet-tx">
                    <span className="wallet-tx__icon"><Icon src={kindIcon(row.kind)} /></span>
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.detail}</small>
                    </span>
                  </span>
                  <span className={`wallet-pill is-${row.status}`}>{statusLabel(row.status)}</span>
                  <span className={row.amount >= 0 ? 'is-in' : 'is-out'}>{formatWalletSigned(row.amount)}</span>
                  <small>{formatWalletLedgerTime(row.time)} · {row.reference}</small>
                  <small>Số dư sau: {row.balanceAfter == null ? '—' : formatWalletAmount(row.balanceAfter)}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <aside className="wallet-rail" aria-label="Tổng kết dòng tiền">
        <h2>Tổng kết dòng tiền</h2>
        <article className="wallet-flow">
          <span>Theo bộ lọc đang chọn</span>
          <p>Dòng tiền ròng</p>
          <strong className={inflow - outflow >= 0 ? 'is-in' : 'is-out'}>
            <span className="sr-only">{inflow - outflow >= 0 ? 'Dương' : 'Âm'}</span>
            {filtered.length === 0 ? '—' : formatWalletSigned(inflow - outflow)}
          </strong>
          <div><span>Tiền vào</span><b className="is-in">{formatWalletSigned(inflow)}</b></div>
          <div><span>Tiền ra</span><b className="is-out">{outflow === 0 ? formatWalletAmount(0) : formatWalletSigned(-outflow)}</b></div>
        </article>
        <h3>Theo loại giao dịch</h3>
        <ul className="wallet-bars">
          {buckets.map((bucket) => (
            <li key={bucket.label}>
              <span>{bucket.label}</span>
              <b>{formatWalletAmount(Math.abs(bucket.amount))}</b>
              <i style={{ width: `${Math.round((Math.abs(bucket.amount) / maxBucket) * 100)}%` }} />
            </li>
          ))}
        </ul>
        <div className="wallet-notice wallet-notice--mint">
          <span className="wallet-notice__icon"><Icon src={WALLET_ASSETS.badge} /></span>
          <span>
            <strong>Sổ dư đã đối soát</strong>
            <small>
              {walletUpdatedAt
                ? `Cập nhật lần cuối ${formatWalletLedgerTime(walletUpdatedAt)}. Các giao dịch thành công đã khớp với đối tác thanh toán.`
                : 'Chưa có mốc cập nhật ví.'}
            </small>
          </span>
        </div>
        <p className="wallet-ledger-note">
          <Icon src={WALLET_ASSETS.info} size={15} />
          <span>Số dư sau giao dịch phản ánh thứ tự ghi sổ, có thể khác thời điểm bạn nhận thông báo.</span>
        </p>
      </aside>
    </div>
  )
}

function sumKind(rows: LedgerRow[], predicate: (row: LedgerRow) => boolean): number {
  return rows.filter(predicate).reduce((sum, row) => sum + Math.abs(row.amount), 0)
}

function Filter({
  label,
  icon,
  value,
  onChange,
  children,
}: {
  label: string
  icon: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="wallet-filter">
      <Icon src={icon} size={15} />
      <span>
        <small>{label}</small>
        <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
      </span>
      <Icon src={WALLET_ASSETS.chevron} size={13} />
    </label>
  )
}

export function WalletEmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="wallet-empty" role="status">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}
