import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { TrendingUp, TrendingDown, Wallet, Building2 } from 'lucide-react'
import type { Currency } from '@/lib/supabase/types'

interface Props {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  accounts: { id: string; name: string; currency: string }[]
  accountBalances: Record<string, number>
}

export function SummaryCards({ totalIncome, totalExpenses, netSavings, accounts, accountBalances }: Props) {
  const totalBalance = Object.values(accountBalances).reduce((s, b) => s + b, 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(totalIncome, 'USD')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(Math.abs(totalExpenses), 'USD')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This month</p>
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net Savings</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${netSavings >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(netSavings, 'USD')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Income − Expenses</p>
        </CardContent>
      </Card>

      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? '' : 'text-destructive'}`}>
            {formatCurrency(totalBalance, 'USD')}
          </p>
          <div className="mt-1 space-y-0.5">
            {accounts.map((a) => (
              <div key={a.id} className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[100px]">{a.name}</span>
                <span>{formatCurrency(accountBalances[a.id] ?? 0, a.currency as Currency)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
