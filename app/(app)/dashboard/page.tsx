import { createClient } from '@/lib/supabase/server'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { MonthlyBarChart } from '@/components/dashboard/monthly-bar-chart'
import { CategoryDonutChart } from '@/components/dashboard/category-donut-chart'
import { BalanceTrendChart } from '@/components/dashboard/balance-trend-chart'
import { MonthPicker } from '@/components/dashboard/month-picker'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

interface SearchParams {
  month?: string // YYYY-MM
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const today = new Date()
  const selectedMonth = params.month ? new Date(`${params.month}-01`) : startOfMonth(today)

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  // Rolling 12 months for trend charts
  const roll12Start = format(startOfMonth(subMonths(today, 11)), 'yyyy-MM-dd')
  const roll12End = format(endOfMonth(today), 'yyyy-MM-dd')

  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: monthTxs },
    { data: roll12Txs },
    { data: accounts },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, is_transfer, category_id')
      .gte('date', monthStart)
      .lte('date', monthEnd),
    supabase
      .from('transactions')
      .select('date, amount, is_transfer')
      .gte('date', roll12Start)
      .lte('date', roll12End),
    supabase
      .from('accounts')
      .select('id, name, currency')
      .order('name'),
    supabase.from('categories').select('id, name, color'),
  ])

  // Account balances: sum of ALL non-transfer transactions per account
  const { data: allBalances } = await supabase
    .from('transactions')
    .select('account_id, amount')
    .eq('is_transfer', false)

  const accountBalances: Record<string, number> = {}
  for (const t of allBalances ?? []) {
    accountBalances[t.account_id] = (accountBalances[t.account_id] ?? 0) + Number(t.amount)
  }

  // Monthly summary (selected month, exclude transfers)
  const filteredMonth = (monthTxs ?? []).filter((t) => !t.is_transfer)
  const totalIncome = filteredMonth.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = filteredMonth.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0)
  const netSavings = totalIncome + totalExpenses

  // Category breakdown for selected month
  const catMap: Record<string, number> = {}
  for (const t of filteredMonth) {
    if (Number(t.amount) < 0 && t.category_id) {
      catMap[t.category_id] = (catMap[t.category_id] ?? 0) + Math.abs(Number(t.amount))
    }
  }
  const categoryData = Object.entries(catMap)
    .map(([id, amount]) => {
      const cat = (categories ?? []).find((c) => c.id === id)
      return { id, name: cat?.name ?? 'Unknown', color: cat?.color ?? '#6b7280', amount }
    })
    .sort((a, b) => b.amount - a.amount)

  // Build 12-month bar/trend data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(today, 11 - i)
    const key = format(m, 'yyyy-MM')
    const label = format(m, 'MMM yy')
    return { key, label, income: 0, expenses: 0 }
  })

  for (const t of roll12Txs ?? []) {
    if (t.is_transfer) continue
    const key = t.date.slice(0, 7) // YYYY-MM
    const entry = monthlyData.find((m) => m.key === key)
    if (!entry) continue
    const a = Number(t.amount)
    if (a > 0) entry.income += a
    else entry.expenses += Math.abs(a)
  }

  // Cumulative net for trend line
  let runningNet = 0
  const trendData = monthlyData.map((m) => {
    runningNet += m.income - m.expenses
    return { ...m, net: parseFloat(runningNet.toFixed(2)) }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold md:text-2xl">Dashboard</h1>
        <MonthPicker selectedMonth={format(selectedMonth, 'yyyy-MM')} />
      </div>

      <SummaryCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        netSavings={netSavings}
        accounts={accounts ?? []}
        accountBalances={accountBalances}
      />

      <div className="grid md:grid-cols-2 gap-6">
        <MonthlyBarChart data={monthlyData} />
        <CategoryDonutChart data={categoryData} selectedMonth={format(selectedMonth, 'MMM yyyy')} />
      </div>

      <BalanceTrendChart data={trendData} />
    </div>
  )
}
