import { createClient } from '@/lib/supabase/server'
import { TransferSuggestions } from '@/components/transfers/transfer-suggestions'
import { ConfirmedTransfers } from '@/components/transfers/confirmed-transfers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const MATCH_DAYS = 3
// Exchange rates relative to USD (add more as needed)
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  KYD: 1.22,  // 1 KYD ≈ 1.22 USD
}
// Tolerance for cross-currency amount matching (5% — covers minor rate fluctuations)
const CROSS_CURRENCY_TOLERANCE = 0.05

function toUSD(amount: number, currency: string): number {
  const rate = RATES_TO_USD[currency.toUpperCase()] ?? 1
  return amount * rate
}

function getCurrency(tx: TxRow): string {
  const acc = Array.isArray(tx.accounts) ? tx.accounts[0] : tx.accounts
  return acc?.currency ?? 'USD'
}

function normalizeDesc(desc: string, stripCurrencies?: string[]): string {
  let text = desc.trim().toLowerCase()
  // Strip appended currency codes (e.g. "... KYD" or "... USD") that banks add
  for (const code of stripCurrencies ?? []) {
    text = text.replace(new RegExp(`\\b${code.toLowerCase()}\\b`, 'g'), '')
  }
  return text.replace(/\s+/g, ' ').trim()
}

function descriptionsMatch(a: TxRow, b: TxRow): boolean {
  const currA = getCurrency(a)
  const currB = getCurrency(b)
  // For cross-currency pairs, strip both currency codes before comparing
  const strip = currA !== currB ? [currA, currB] : []
  return normalizeDesc(a.description, strip) === normalizeDesc(b.description, strip)
}

function amountsMatch(a: TxRow, b: TxRow): boolean {
  const absA = Math.abs(Number(a.amount))
  const absB = Math.abs(Number(b.amount))
  const currA = getCurrency(a)
  const currB = getCurrency(b)

  if (currA === currB) {
    return Math.abs(absA - absB) <= 0.01
  }

  // Cross-currency: convert both to USD and compare within tolerance
  const usdA = toUSD(absA, currA)
  const usdB = toUSD(absB, currB)
  const avg = (usdA + usdB) / 2
  return avg > 0 && Math.abs(usdA - usdB) / avg <= CROSS_CURRENCY_TOLERANCE
}

interface TxRow {
  id: string
  account_id: string
  date: string
  amount: number
  description: string
  accounts: { id: string; name: string; currency: string } | { id: string; name: string; currency: string }[] | null
}

export default async function TransfersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all non-transfer transactions grouped by account for auto-matching
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, account_id, date, amount, description, accounts(id, name, currency)')
    .eq('user_id', user.id)
    .eq('is_transfer', false)
    .is('transfer_id', null)
    .order('date', { ascending: false })
    .limit(1000)

  // Auto-detect suggestions: find pairs across different accounts with matching |amount| ± 3 days
  const suggestions: Array<{ txA: TxRow; txB: TxRow }> = []
  const matched = new Set<string>()

  const txList = (transactions ?? []) as unknown as TxRow[]

  if (txList.length > 0) {
    for (let i = 0; i < txList.length; i++) {
      const a = txList[i]
      if (matched.has(a.id)) continue

      for (let j = i + 1; j < txList.length; j++) {
        const b = txList[j]
        if (matched.has(b.id)) continue
        if (a.account_id === b.account_id) continue

        // Amount must be opposite signs and matching value (same or cross-currency)
        if (!amountsMatch(a, b)) continue
        if (Math.sign(Number(a.amount)) === Math.sign(Number(b.amount))) continue

        // Cross-currency transfers always share the same description
        if (getCurrency(a) !== getCurrency(b) && !descriptionsMatch(a, b)) continue

        // Within MATCH_DAYS days of each other
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        const diffDays = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24)
        if (diffDays > MATCH_DAYS) continue

        suggestions.push({ txA: a, txB: b })
        matched.add(a.id)
        matched.add(b.id)
        break
      }
    }
  }

  // Fetch confirmed transfers
  const { data: confirmed } = await supabase
    .from('transactions')
    .select('id, date, description, amount, transfer_id, account_id, accounts(id, name, currency)')
    .eq('user_id', user.id)
    .eq('is_transfer', true)
    .not('transfer_id', 'is', null)
    .order('date', { ascending: false })
    .limit(200)

  // De-duplicate confirmed pairs (each pair shows up as 2 rows)
  const seenPairs = new Set<string>()
  const uniqueConfirmed = (confirmed ?? []).filter((tx) => {
    const pairKey = [tx.id, tx.transfer_id].sort().join('|')
    if (seenPairs.has(pairKey)) return false
    seenPairs.add(pairKey)
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Transfer Tracking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Link transactions across accounts to avoid double-counting. Matched by equal amount ± {MATCH_DAYS} days (cross-currency: 1 KYD = 0.82 USD).
        </p>
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">
            Suggestions
            {suggestions.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            Confirmed ({uniqueConfirmed.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suggestions" className="mt-4">
          <TransferSuggestions suggestions={suggestions as unknown as Array<{ txA: Parameters<typeof TransferSuggestions>[0]['suggestions'][0]['txA']; txB: Parameters<typeof TransferSuggestions>[0]['suggestions'][0]['txB'] }>} />
        </TabsContent>
        <TabsContent value="confirmed" className="mt-4">
          <ConfirmedTransfers transfers={uniqueConfirmed as unknown as Parameters<typeof ConfirmedTransfers>[0]['transfers']} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
