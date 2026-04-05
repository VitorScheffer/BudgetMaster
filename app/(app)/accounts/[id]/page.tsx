import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AccountForm } from '@/components/accounts/account-form'
import { DeleteAccountButton } from '@/components/accounts/delete-account-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import type { Account, Currency } from '@/lib/supabase/types'
import { format } from 'date-fns'

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: rawAccount }, { data: rawTransactions }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).single(),
    supabase
      .from('transactions')
      .select('id, date, description, amount, category_id, is_transfer, categories(id, name, color)')
      .eq('account_id', id)
      .order('date', { ascending: false })
      .limit(50),
  ])

  const account = rawAccount as Account | null
  if (!account) notFound()

  const transactions = rawTransactions as Array<{
    id: string
    date: string
    description: string
    amount: number
    category_id: string | null
    is_transfer: boolean
    categories: { id: string; name: string; color: string } | null
  }> | null

  const balance = (transactions ?? []).reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">{account.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            <Badge variant="secondary">{account.type.replace('_', ' ')}</Badge>{' '}
            {account.currency}
          </p>
        </div>
        <p className={`text-3xl font-bold tabular-nums ${balance < 0 ? 'text-destructive' : ''}`}>
          {formatCurrency(balance, account.currency as Currency)}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountForm account={account} />
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Danger zone — deleting an account removes all associated transactions.
              </p>
              <DeleteAccountButton accountId={account.id} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href={`/transactions?account=${id}`} className="text-sm underline text-muted-foreground">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {(!transactions || transactions.length === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No transactions yet.{' '}
                <Link href="/import" className="underline">Import CSV</Link>
              </p>
            ) : (
              <div className="divide-y text-sm">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center py-2 gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{tx.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(tx.date), 'dd MMM yyyy')}
                        {tx.categories && (
                          <span
                            className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-xs"
                            style={{
                              background: (tx.categories as { color: string }).color + '20',
                              color: (tx.categories as { color: string }).color,
                            }}
                          >
                            {(tx.categories as { name: string }).name}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm shrink-0 ${
                        Number(tx.amount) < 0 ? 'text-destructive' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(Number(tx.amount), account.currency as Currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
