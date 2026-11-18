import { useQuery } from '@tanstack/react-query'
import { getMomoWalletAvailability, type MomoWallet } from '../api'
import { loadPaymentScript } from '../lib/paymentScript'

export const momoWalletLabels = {
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
} satisfies Record<MomoWallet, string>

export function isMomoWallet(method: string): method is MomoWallet {
  return method === 'apple-pay' || method === 'google-pay'
}

type GooglePaymentsClient = new (options: { environment: 'TEST' | 'PRODUCTION' }) => {
  isReadyToPay(request: object): Promise<{ result: boolean }>
}

const walletWindow = window as Window & {
  ApplePaySession?: { canMakePayments(): boolean }
  google?: { payments?: { api?: { PaymentsClient?: GooglePaymentsClient } } }
}

async function googlePayReady(test: boolean) {
  await loadPaymentScript('https://pay.google.com/gp/p/js/pay.js')
  const PaymentsClient = walletWindow.google?.payments?.api?.PaymentsClient
  if (!PaymentsClient) return false
  const client = new PaymentsClient({ environment: test ? 'TEST' : 'PRODUCTION' })
  return (await client.isReadyToPay({
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [{ type: 'EWALLET', processingSpecification: { type: 'MOMO' } }],
  })).result
}

export function useMomoWallets(enabled = true) {
  const { data } = useQuery({
    queryKey: ['momo-device-wallets'],
    enabled,
    retry: false,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const config = await getMomoWalletAvailability(signal)
      const wallets: MomoWallet[] = []
      if (config.applePay && window.isSecureContext && walletWindow.ApplePaySession?.canMakePayments()) {
        wallets.push('apple-pay')
      }
      if (config.googlePay && await googlePayReady(config.test).catch(() => false)) {
        wallets.push('google-pay')
      }
      return wallets
    },
  })
  return data ?? []
}
