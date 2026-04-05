import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, CreditCard, Landmark, PiggyBank } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { AccountType, Currency } from '@/lib/supabase/types'

const TYPE_CONFIG: Record<AccountType, { label: string; icon: React.FC<{ className?: string }> }> = {
  checking: { label: 'Checking', icon: Landmark },
  savings: { label: 'Savings', icon: PiggyBank },
  credit_card: { label: 'Credit Card', icon: CreditCard },
}

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })

  // Compute running balances per account
  const { data: rawBalances } = await supabase
    .from('transactions')
    .select('account_id, amount')
    .eq('is_transfer', false)

  const balances = (rawBalances ?? []) as Array<{ account_id: string; amount: number }>
  const balanceMap: Record<string, number> = {}
  for (const t of balances ?? []) {
    balanceMap[t.account_id] = (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold md:text-2xl">Accounts</h1>
        <Link href="/accounts/new" className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground bg-clip-padding text-sm font-medium whitespace-nowrap h-8 gap-1.5 px-2.5">
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Link>
      </div>

      {(!accounts || accounts.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No accounts yet.{' '}
            <Link href="/accounts/new" className="underline">
              Create your first account
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const config = TYPE_CONFIG[account.type as AccountType]
            const Icon = config.icon
            const balance = balanceMap[account.id] ?? 0
            return (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="secondary" className="mt-1">
                          {config.label}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-2xl font-bold tabular-nums ${
                        balance < 0 ? 'text-destructive' : 'text-foreground'
                      }`}
                    >
                      {formatCurrency(balance, account.currency as Currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{account.currency}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
