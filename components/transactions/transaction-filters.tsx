'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, SlidersHorizontal, X } from 'lucide-react'

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

const PRESETS = [
  {
    label: 'This month',
    from: () => format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  },
  {
    label: 'Last month',
    from: () => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    to: () => format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
  },
  {
    label: 'Last 3 months',
    from: () => format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    to: () => format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  },
]

export function TransactionFilters({ accounts, categories, current }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(current.search ?? '')

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

  // Debounce search — only push URL after 400 ms of no typing
  useEffect(() => {
    const timer = setTimeout(() => {
      update('search', searchValue || undefined)
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue])

  // Keep local search in sync when URL param is cleared externally
  useEffect(() => {
    setSearchValue(current.search ?? '')
  }, [current.search])

  const safeUpdate = useCallback(
    (key: string, v: string | null | undefined) => update(key, v == null ? undefined : v),
    [update]
  )

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('from', preset.from())
    params.set('to', preset.to())
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearAll() {
    setSearchValue('')
    startTransition(() => router.push(pathname))
  }

  // Build active filter chips
  const chips: { label: string; key: string }[] = []
  if (current.search) chips.push({ label: `"${current.search}"`, key: 'search' })
  if (current.account) {
    const name = accounts.find((a) => a.id === current.account)?.name ?? current.account
    chips.push({ label: name, key: 'account' })
  }
  if (current.category) {
    const label =
      current.category === 'uncategorized'
        ? 'Uncategorized'
        : (categories.find((c) => c.id === current.category)?.name ?? current.category)
    chips.push({ label, key: 'category' })
  }
  if (current.type) chips.push({ label: current.type, key: 'type' })
  if (current.from || current.to) {
    const label = [current.from, current.to].filter(Boolean).join(' – ')
    chips.push({ label, key: 'date' })
  }

  function removeChip(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (key === 'date') {
      params.delete('from')
      params.delete('to')
    } else {
      params.delete(key)
    }
    if (key === 'search') setSearchValue('')
    params.delete('page')
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {chips.length > 0 && (
            <Badge variant="secondary" className="h-4 w-4 p-0 justify-center text-[10px] rounded-full">
              {chips.length}
            </Badge>
          )}
        </div>
        {chips.length > 0 && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search description…"
            value={searchValue}
            className="pl-8"
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>

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
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
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
      </div>

      {/* Date quick-presets */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs text-muted-foreground">Quick:</span>
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center pt-0.5 border-t">
          <span className="text-xs text-muted-foreground">Active:</span>
          {chips.map((chip) => (
            <Badge
              key={chip.key}
              variant="secondary"
              className="gap-1 pr-1 text-xs cursor-pointer hover:bg-destructive/10"
              onClick={() => removeChip(chip.key)}
            >
              {chip.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
