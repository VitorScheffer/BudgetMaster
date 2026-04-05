'use client'

import { useTransition } from 'react'
import { confirmTransfer } from '@/app/actions/transactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { Currency } from '@/lib/supabase/types'

interface TxRef {
  id: string
  date: string
  description: string
  amount: number
  accounts: { id: string; name: string; currency: string } | null
}

interface Props {
  suggestions: Array<{ txA: TxRef; txB: TxRef }>
}

export function TransferSuggestions({ suggestions }: Props) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No transfer suggestions right now.</p>
          <p className="text-sm mt-1">Import more transactions and check back.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {suggestions.map(({ txA, txB }) => (
        <SuggestionCard key={`${txA.id}-${txB.id}`} txA={txA} txB={txB} />
      ))}
    </div>
  )
}

function SuggestionCard({ txA, txB }: { txA: TxRef; txB: TxRef }) {
  const [pending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      try {
        await confirmTransfer(txA.id, txB.id)
        toast.success('Transfer confirmed — excluded from totals')
      } catch {
        toast.error('Failed to confirm transfer')
      }
    })
  }

  return (
    <Card className={pending ? 'opacity-50' : ''}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-medium truncate">{txA.description}</p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(txA.date), 'dd MMM yyyy')} · {txA.accounts?.name}
            </p>
            <span className={`font-mono ${Number(txA.amount) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(Number(txA.amount), (txA.accounts?.currency ?? 'USD') as Currency)}
            </span>
          </div>

          <ArrowLeftRight className="h-5 w-5 text-muted-foreground shrink-0" />

          <div className="flex-1 min-w-0 text-sm text-right">
            <p className="font-medium truncate">{txB.description}</p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(txB.date), 'dd MMM yyyy')} · {txB.accounts?.name}
            </p>
            <span className={`font-mono ${Number(txB.amount) < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(Number(txB.amount), (txB.accounts?.currency ?? 'USD') as Currency)}
            </span>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleConfirm} disabled={pending}>
              Confirm transfer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
