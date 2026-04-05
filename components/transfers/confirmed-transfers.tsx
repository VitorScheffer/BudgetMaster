'use client'

import { useTransition } from 'react'
import { unlinkTransfer } from '@/app/actions/transactions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeftRight, Unlink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { Currency } from '@/lib/supabase/types'

interface TxRef {
  id: string
  date: string
  description: string
  amount: number
  transfer_id: string | null
  accounts: { id: string; name: string; currency: string } | null
}

interface Props {
  transfers: TxRef[]
}

export function ConfirmedTransfers({ transfers }: Props) {
  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No confirmed transfers yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {transfers.map((tx) => (
        <ConfirmedRow key={tx.id} tx={tx} />
      ))}
    </div>
  )
}

function ConfirmedRow({ tx }: { tx: TxRef }) {
  const [pending, startTransition] = useTransition()

  function handleUnlink() {
    startTransition(async () => {
      try {
        await unlinkTransfer(tx.id)
        toast.success('Transfer unlinked')
      } catch {
        toast.error('Failed to unlink transfer')
      }
    })
  }

  return (
    <Card className={pending ? 'opacity-50' : ''}>
      <CardContent className="py-3">
        <div className="flex items-center gap-4">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-medium truncate">{tx.description}</p>
            <p className="text-muted-foreground text-xs">
              {format(new Date(tx.date), 'dd MMM yyyy')} · {tx.accounts?.name}
            </p>
          </div>
          <span
            className={`font-mono text-sm shrink-0 ${
              Number(tx.amount) < 0 ? 'text-destructive' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(Number(tx.amount), (tx.accounts?.currency ?? 'USD') as Currency)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleUnlink}
            disabled={pending}
          >
            <Unlink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
