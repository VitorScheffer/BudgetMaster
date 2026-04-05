'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Props {
  accounts: { id: string; name: string }[]
  categories: { id: string; name: string; color: string }[]
  current: {
    account?: string
    category?: string
    from?: string
    to?: string
    search?: string
    type?: string
  }
}

export function TransactionFilters({ accounts, categories, current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const update = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      startTransition(() => router.push(`${pathname}?${params.toString()}`))
    },
    [router, pathname, searchParams]
  )

  const hasFilters = Object.values(current).some(Boolean)

  function clearAll() {
    startTransition(() => router.push(pathname))
  }

  const safeUpdate = useCallback(
    (key: string, v: string | null | undefined) => update(key, v == null ? undefined : v),
    [update]
  )

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <Input
        placeholder="Search description…"
        defaultValue={current.search}
        className="w-full sm:w-52"
        onChange={(e) => update('search', e.target.value || undefined)}
      />

      <Select
        value={current.account ?? 'all'}
        onValueChange={(v) => safeUpdate('account', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.category ?? 'all'}
        onValueChange={(v) => safeUpdate('category', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.type ?? 'all'}
        onValueChange={(v) => safeUpdate('type', v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
          <SelectItem value="transfer">Transfer</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-1 items-center w-full sm:w-auto">
        <Input
          type="date"
          value={current.from ?? ''}
          className="flex-1 sm:w-36"
          onChange={(e) => update('from', e.target.value || undefined)}
        />
        <span className="text-muted-foreground text-sm">–</span>
        <Input
          type="date"
          value={current.to ?? ''}
          className="flex-1 sm:w-36"
          onChange={(e) => update('to', e.target.value || undefined)}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
