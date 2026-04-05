import type { Currency } from '@/lib/supabase/types'

const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  KYD: new Intl.NumberFormat('en-KY', { style: 'currency', currency: 'KYD' }),
}

export function formatCurrency(amount: number, currency: Currency = 'USD'): string {
  return formatters[currency].format(amount)
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'auto',
  }).format(amount)
}
