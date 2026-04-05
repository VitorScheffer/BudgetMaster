'use client'

import { useTransition } from 'react'
import { syncDefaultCategories } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

export function SyncCategoriesButton() {
  const [pending, startTransition] = useTransition()

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncDefaultCategories()
        if (result.added === 0 && result.rulesAdded === 0) {
          toast.info('Everything is already up to date')
        } else {
          const parts: string[] = []
          if (result.added > 0) parts.push(`${result.added} new categor${result.added === 1 ? 'y' : 'ies'}`)
          if (result.rulesAdded > 0) parts.push(`${result.rulesAdded} new rule${result.rulesAdded === 1 ? '' : 's'}`)
          toast.success(`Synced defaults: ${parts.join(' and ')} added`)
        }
      } catch {
        toast.error('Failed to sync categories')
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={pending}>
      <RefreshCw className={`mr-2 h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
      {pending ? 'Syncing…' : 'Sync default categories'}
    </Button>
  )
}
