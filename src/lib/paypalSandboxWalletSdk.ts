import { loadPaymentScript } from './paymentScript'

type Wallet = 'google-pay' | 'apple-pay'
type WalletConfig = {
  clientId: string
  googlePay: boolean
  applePay: boolean
  mode?: 'sandbox' | 'live'
  totalUsd?: string
  label?: string
}
type Authorize = (wallet: Wallet, confirm: (orderId: string) => Promise<void>) => Promise<boolean>
type StartPayment = (payment: () => Promise<void>) => void

type GoogleConfig = { isEligible?: boolean; allowedPaymentMethods?: unknown[]; merchantInfo: object }
type GoogleAuthorization = { transactionState: 'SUCCESS' } | {
  transactionState: 'ERROR'
  error: { intent: 'PAYMENT_AUTHORIZATION'; reason: 'OTHER_ERROR'; message: string }
}
type GoogleClient = {
  isReadyToPay(request: object): Promise<{ result: boolean }>
  createButton(options: object): HTMLElement
  loadPaymentData(request: object): Promise<unknown>
}
type AppleSession = {
  onvalidatemerchant: (event: { validationURL: string }) => void
  onpaymentauthorized: (event: { payment: { token: unknown; billingContact?: unknown } }) => void
  oncancel: () => void
  begin(): void
  abort(): void
  completeMerchantValidation(merchantSession: unknown): void
  completePayment(status: number): void
}

const sdk = window as Window & {
  paypal?: {
    Googlepay?(): {
      config(): Promise<GoogleConfig>
      confirmOrder(request: object): Promise<{ status: string }>
      initiatePayerAction(request: object): Promise<{ liabilityShift: string }>
    }
    Applepay?(): {
      config(): Promise<{ isEligible: boolean; countryCode: string; supportedNetworks: string[]; merchantCapabilities: string[] }>
      validateMerchant(request: object): Promise<{ merchantSession: unknown }>
      confirmOrder(request: object): Promise<unknown>
    }
  }
  google?: { payments?: { api?: {
    PaymentsClient: new (options: {
      environment: 'TEST' | 'PRODUCTION'
      paymentDataCallbacks: {
        onPaymentAuthorized(data: { paymentMethodData: unknown }): Promise<GoogleAuthorization>
      }
    }) => GoogleClient
  } } }
  ApplePaySession?: {
    new (version: number, request: object): AppleSession
    supportsVersion(version: number): boolean
    canMakePayments(): boolean
    STATUS_SUCCESS: number
    STATUS_FAILURE: number
  }
}


export class WalletUnavailableError extends Error {}

export function extractWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'string' && error.trim()) return error.trim()
  if (error && typeof error === 'object') {
    const record = error as {
      statusMessage?: unknown
      message?: unknown
      name?: unknown
      details?: Array<{ issue?: unknown; description?: unknown }>
    }
    const detail = Array.isArray(record.details) ? record.details[0] : undefined
    const detailText = typeof detail?.description === 'string' && detail.description.trim()
      ? detail.description.trim()
      : typeof detail?.issue === 'string' && detail.issue.trim()
        ? detail.issue.trim()
        : ''
    const main = typeof record.statusMessage === 'string' && record.statusMessage.trim()
      ? record.statusMessage.trim()
      : typeof record.message === 'string' && record.message.trim()
        ? record.message.trim()
        : typeof record.name === 'string' && record.name.trim()
          ? record.name.trim()
          : ''
    if (main && detailText && !main.includes(detailText)) return `${main} (${detailText})`
    if (main || detailText) return main || detailText
  }
  return fallback
}

async function hasApplePayDomainAssociation() {
  try {
    const response = await fetch('/.well-known/apple-developer-merchantid-domain-association', {
      cache: 'no-store',
    })
    if (!response.ok) return false
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (contentType.includes('text/html')) return false
    const body = (await response.text()).trim()
    return body.length > 0 && !body.startsWith('<')
  } catch {
    return false
  }
}

export function loadPayPalWalletSdk(config: WalletConfig) {
  const url = new URL('https://www.paypal.com/sdk/js')
  const components = [config.googlePay && 'googlepay', config.applePay && 'applepay'].filter(Boolean)
  const params: Record<string, string> = {
    'client-id': config.clientId,
    currency: 'USD',
    components: components.join(','),
  }
  if (config.mode !== 'live') params['buyer-country'] = 'US'
  url.search = new URLSearchParams(params).toString()
  return loadPaymentScript(url.href)
}

export async function createGooglePayButton(
  start: StartPayment,
  authorize: Authorize,
  options?: { environment?: 'TEST' | 'PRODUCTION'; totalPrice?: string },
) {
  await loadPaymentScript('https://pay.google.com/gp/p/js/pay.js')
  const bridge = sdk.paypal?.Googlepay?.()
  const PaymentsClient = sdk.google?.payments?.api?.PaymentsClient
  if (!bridge || !PaymentsClient) return null

  const { isEligible, allowedPaymentMethods, merchantInfo } = await bridge.config()
  if (isEligible === false || !allowedPaymentMethods?.length) return null
  const base = { apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods }
  const client = new PaymentsClient({
    environment: options?.environment ?? 'TEST',
    paymentDataCallbacks: {
      onPaymentAuthorized: async ({ paymentMethodData }) => {
        const completed = await authorize('google-pay', async (orderId) => {
          const { status } = await bridge.confirmOrder({ orderId, paymentMethodData })
          if (status === 'APPROVED') return
          if (status === 'PAYER_ACTION_REQUIRED') {
            const { liabilityShift } = await bridge.initiatePayerAction({ orderId })
            if (liabilityShift === 'POSSIBLE') return
          }
          throw new Error('Google Pay chưa xác thực đơn hàng.')
        })
        return completed
          ? { transactionState: 'SUCCESS' }
          : { transactionState: 'ERROR', error: {
            intent: 'PAYMENT_AUTHORIZATION', reason: 'OTHER_ERROR',
            message: 'Homeji chưa xác nhận được giao dịch.',
          } }
      },
    },
  })
  if (!(await client.isReadyToPay(base)).result) return null

  const request = {
    ...base,
    merchantInfo,
    callbackIntents: ['PAYMENT_AUTHORIZATION'],
    transactionInfo: {
      currencyCode: 'USD',
      totalPriceStatus: 'FINAL',
      totalPrice: options?.totalPrice ?? '1.00',
    },
  }
  return client.createButton({
    allowedPaymentMethods,
    buttonColor: 'black',
    buttonType: 'pay',
    buttonRadius: 12,
    buttonSizeMode: 'fill',
    buttonLocale: 'vi',
    onClick: () => start(async () => {
      try {
        await client.loadPaymentData(request)
      } catch (error) {
        if ((error as { statusCode?: string } | null)?.statusCode !== 'CANCELED') throw error
      }
    }),
  })
}

export async function createApplePayButton(
  start: StartPayment,
  authorize: Authorize,
  options?: { totalPrice?: string; label?: string },
) {
  if (window.location.protocol !== 'https:') return null
  await loadPaymentScript('https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js')
  const Session = sdk.ApplePaySession
  const bridge = sdk.paypal?.Applepay?.()
  if (!Session || !bridge || !Session.supportsVersion(4) || !Session.canMakePayments()) return null

  const { isEligible, countryCode, supportedNetworks, merchantCapabilities } = await bridge.config()
  if (!isEligible) return null

  if (!(await hasApplePayDomainAssociation())) {
    throw new WalletUnavailableError(
      'Apple Pay chưa được xác thực tên miền (/.well-known/apple-developer-merchantid-domain-association). Bạn có thể thanh toán trực tiếp qua PayPal hoặc thẻ quốc tế bên dưới.',
    )
  }

  const label = options?.label ?? 'Homeji'
  const amount = options?.totalPrice ?? '1.00'
  const button = document.createElement('apple-pay-button')
  button.setAttribute('buttonstyle', 'black')
  button.setAttribute('type', 'pay')
  button.setAttribute('locale', 'vi-VN')
  button.addEventListener('click', () => start(() => new Promise<void>((resolve, reject) => {
    const session = new Session(4, {
      countryCode, supportedNetworks, merchantCapabilities, currencyCode: 'USD',
      total: { label, type: 'final', amount },
    })
    let authorizing = false
    let cancelled = false
    session.oncancel = () => {
      cancelled = true
      if (!authorizing) resolve()
    }
    session.onvalidatemerchant = ({ validationURL }) => {
      void bridge.validateMerchant({ validationUrl: validationURL, displayName: label })
        .then(({ merchantSession }) => {
          if (!cancelled) session.completeMerchantValidation(merchantSession)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          reject(new Error(extractWalletErrorMessage(error, 'Không xác minh được Apple Pay với PayPal.')))
          session.abort()
        })
    }
    session.onpaymentauthorized = ({ payment }) => {
      authorizing = true
      void authorize('apple-pay', async (orderId) => {
        await bridge.confirmOrder({ orderId, token: payment.token, billingContact: payment.billingContact })
      }).then((completed) => {
        if (!cancelled) session.completePayment(completed ? Session.STATUS_SUCCESS : Session.STATUS_FAILURE)
      }).then(resolve, reject)
    }
    session.begin()
  })))
  return button
}

export type { Authorize, Wallet, WalletConfig }
