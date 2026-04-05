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
import { Trash2, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
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
}

export function TransactionTable({ transactions, categories, page, totalPages, total }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} transactions</span>
        {totalPages > 1 && (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No transactions found
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
          <p className="text-center py-10 text-muted-foreground text-sm">No transactions found</p>
        ) : (
          transactions.map((tx) => (
            <MobileTransactionCard key={tx.id} tx={tx} categories={categories} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
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

  return (
    <TableRow className={pending ? 'opacity-50' : ''}>
      <TableCell className="whitespace-nowrap text-sm">
        {format(new Date(tx.date), 'dd MMM yyyy')}
        {tx.is_pending && (
          <Badge variant="outline" className="ml-1 text-xs py-0">
            pending
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="flex items-center gap-1.5">
          {tx.is_transfer && (
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="truncate text-sm">{tx.description}</span>
        </div>
        <span className="text-xs text-muted-foreground">{tx.accounts?.name}</span>
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
          <SelectTrigger className="h-7 text-xs w-36">
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
                <span className="text-muted-foreground">—</span>
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
      <TableCell className="text-right font-mono text-sm">
        <span className={Number(tx.amount) < 0 ? 'text-destructive' : 'text-emerald-600'}>
          {formatCurrency(Number(tx.amount), currency)}
        </span>
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
    <div className={`rounded-lg border bg-card p-3 space-y-2 ${pending ? 'opacity-50' : ''}`}>
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
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
        <span className={`font-mono font-semibold text-sm tabular-nums ${Number(tx.amount) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
          {formatCurrency(Number(tx.amount), currency)}
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
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
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
                <span className="text-muted-foreground">— No category —</span>
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
