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

type GoogleConfig = { allowedPaymentMethods: unknown[]; merchantInfo: object }
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

const scripts = new Map<string, Promise<void>>()

function loadScript(url: string) {
  const loaded = scripts.get(url)
  if (loaded) return loaded

  const script = document.createElement('script')
  const loading = new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(fail, 12_000)
    function fail() {
      window.clearTimeout(timer)
      script.remove()
      reject(new Error('Không tải được SDK thanh toán.'))
    }
    script.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }
    script.onerror = fail
    script.src = url
    document.head.append(script)
  }).catch((error: unknown) => {
    scripts.delete(url)
    throw error
  })
  scripts.set(url, loading)
  return loading
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
  return loadScript(url.href)
}

export async function createGooglePayButton(
  start: StartPayment,
  authorize: Authorize,
  options?: { environment?: 'TEST' | 'PRODUCTION'; totalPrice?: string },
) {
  await loadScript('https://pay.google.com/gp/p/js/pay.js')
  const bridge = sdk.paypal?.Googlepay?.()
  const PaymentsClient = sdk.google?.payments?.api?.PaymentsClient
  if (!bridge || !PaymentsClient) return null

  const { allowedPaymentMethods, merchantInfo } = await bridge.config()
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
    buttonType: 'pay',
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
  await loadScript('https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js')
  const Session = sdk.ApplePaySession
  const bridge = sdk.paypal?.Applepay?.()
  if (!Session || !bridge || !Session.supportsVersion(4) || !Session.canMakePayments()) return null

  const { isEligible, countryCode, supportedNetworks, merchantCapabilities } = await bridge.config()
  if (!isEligible) return null

  const label = options?.label ?? 'Homeji Sandbox'
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
          reject(error instanceof Error ? error : new Error('Không xác minh được Apple Pay.'))
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
