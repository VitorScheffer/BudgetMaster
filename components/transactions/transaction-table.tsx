'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { updateTransactionCategory, deleteTransaction } from '@/app/actions/transactions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, ChevronLeft, ChevronRight, ArrowLeftRight, Receipt, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { Currency } from '@/lib/supabase/types'

interface TxRow {
  id: string
  date: string
  description: string
  amount: number
  is_transfer: boolean
  is_pending: boolean
  category_id: string | null
  categories: { id: string; name: string; color: string } | null
  accounts: { id: string; name: string; type: string; currency: string } | null
}

interface Props {
  transactions: TxRow[]
  categories: { id: string; name: string; color: string }[]
  page: number
  totalPages: number
  total: number
  incomeTotal: number
  expenseTotal: number
}

export function TransactionTable({ transactions, categories, page, totalPages, total, incomeTotal, expenseTotal }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  const net = incomeTotal + expenseTotal

  // Build page number list with ellipsis
  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const nums: (number | '…')[] = [1]
    if (page > 3) nums.push('…')
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) nums.push(p)
    if (page < totalPages - 2) nums.push('…')
    nums.push(totalPages)
    return nums
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-lg font-semibold tabular-nums">{total}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            Income
          </p>
          <p className="text-lg font-semibold tabular-nums text-emerald-600">
            +{formatCurrency(incomeTotal, 'USD')}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-rose-500" />
            Expenses
          </p>
          <p className="text-lg font-semibold tabular-nums text-rose-600">
            {formatCurrency(expenseTotal, 'USD')}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={`text-lg font-semibold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net, 'USD')}
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[120px] font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Account</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="text-right font-semibold">Amount</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Receipt className="h-10 w-10 opacity-25" />
                    <p className="text-sm">No transactions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} categories={categories} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Receipt className="h-10 w-10 opacity-25" />
            <p className="text-sm">No transactions found</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <MobileTransactionCard key={tx.id} tx={tx} categories={categories} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1 mx-1">
            {pageNumbers().map((n, i) =>
              n === '…' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
              ) : (
                <Button
                  key={n}
                  variant={n === page ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0 text-xs"
                  onClick={() => setPage(n as number)}
                >
                  {n}
                </Button>
              )
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function TransactionRow({
  tx,
  categories,
}: {
  tx: TxRow
  categories: { id: string; name: string; color: string }[]
}) {
  const [pending, startTransition] = useTransition()

  function handleCategoryChange(categoryId: string | null) {
    if (categoryId == null) return
    startTransition(async () => {
      try {
        const result = await updateTransactionCategory(tx.id, categoryId === 'none' ? null : categoryId)
        if (result?.ruleCreated) {
          toast.success('Category saved — rule learned for future transactions')
        }
      } catch {
        toast.error('Failed to update category')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTransaction(tx.id)
        toast.success('Transaction deleted')
      } catch {
        toast.error('Failed to delete')
      }
    })
  }

  const currency = (tx.accounts?.currency ?? 'USD') as Currency
  const amount = Number(tx.amount)
  const accentClass = tx.is_transfer
    ? 'border-l-sky-400'
    : amount > 0
      ? 'border-l-emerald-500'
      : 'border-l-rose-500'
  const amountStr = amount > 0 ? `+${formatCurrency(amount, currency)}` : formatCurrency(amount, currency)
  const amountColor = amount > 0 ? 'text-emerald-600' : 'text-rose-600'

  return (
    <TableRow className={pending ? 'opacity-50' : ''}>
      <TableCell className={`border-l-[3px] ${accentClass} pl-3 whitespace-nowrap text-sm`}>
        {format(new Date(tx.date), 'dd MMM yyyy')}
        {tx.is_pending && (
          <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1">
            pending
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="flex items-center gap-1.5">
          {tx.is_transfer && (
            <ArrowLeftRight className="h-3.5 w-3.5 text-sky-500 shrink-0" />
          )}
          <span className="truncate text-sm font-medium">{tx.description}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {tx.accounts?.name}
      </TableCell>
      <TableCell>
        <Select
          value={tx.category_id ?? 'none'}
          onValueChange={handleCategoryChange}
          disabled={pending}
        >
          <SelectTrigger className="h-7 text-xs w-36 border-dashed">
            <SelectValue placeholder="—">
              {tx.categories ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: tx.categories.color }}
                  />
                  {tx.categories.name}
                </span>
              ) : (
                <span className="text-muted-foreground/60 italic text-[11px]">uncategorized</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
        <span className={amountColor}>{amountStr}</span>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={pending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function MobileTransactionCard({
  tx,
  categories,
}: {
  tx: TxRow
  categories: { id: string; name: string; color: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const currency = (tx.accounts?.currency ?? 'USD') as Currency
  const amount = Number(tx.amount)
  const accentClass = tx.is_transfer
    ? 'border-l-sky-400'
    : amount > 0
      ? 'border-l-emerald-500'
      : 'border-l-rose-500'
  const amountStr = amount > 0 ? `+${formatCurrency(amount, currency)}` : formatCurrency(amount, currency)
  const amountColor = amount > 0 ? 'text-emerald-600' : 'text-rose-600'

  function handleCategoryChange(categoryId: string | null) {
    if (categoryId == null) return
    startTransition(async () => {
      try {
        const result = await updateTransactionCategory(tx.id, categoryId === 'none' ? null : categoryId)
        if (result?.ruleCreated) {
          toast.success('Category saved — rule learned for future transactions')
        }
      } catch {
        toast.error('Failed to update category')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteTransaction(tx.id)
        toast.success('Transaction deleted')
      } catch {
        toast.error('Failed to delete')
      }
    })
  }

  return (
    <div className={`rounded-lg border border-l-[3px] ${accentClass} bg-card p-3 space-y-2 ${pending ? 'opacity-50' : ''}`}>
      {/* Row 1: date + amount */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
          {format(new Date(tx.date), 'dd MMM yyyy')}
          {tx.is_pending && (
            <Badge variant="outline" className="text-[10px] py-0 px-1 leading-tight">
              pending
            </Badge>
          )}
          {tx.is_transfer && (
            <ArrowLeftRight className="h-3 w-3 text-sky-500" />
          )}
        </span>
        <span className={`font-mono font-semibold text-sm tabular-nums ${amountColor}`}>
          {amountStr}
        </span>
      </div>

      {/* Row 2: description + account */}
      <div>
        <p className="text-sm font-medium truncate">{tx.description}</p>
        <p className="text-xs text-muted-foreground">{tx.accounts?.name}</p>
      </div>

      {/* Row 3: category select + delete */}
      <div className="flex items-center gap-2">
        <Select
          value={tx.category_id ?? 'none'}
          onValueChange={handleCategoryChange}
          disabled={pending}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0 border-dashed">
            <SelectValue placeholder="—">
              {tx.categories ? (
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: tx.categories.color }}
                  />
                  <span className="truncate">{tx.categories.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground/60 italic text-[11px]">uncategorized</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={pending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
