'use client'

import { useTransition } from 'react'
import { applyCategoriesToUncategorized } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Wand2 } from 'lucide-react'

export function ApplyCategoriesButton() {
  const [pending, startTransition] = useTransition()

  function handleApply() {
    startTransition(async () => {
      try {
        const result = await applyCategoriesToUncategorized()
        toast.success(`Auto-categorized ${result.updated} transactions`)
      } catch {
        toast.error('Failed to apply categories')
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleApply} disabled={pending}>
      <Wand2 className="mr-2 h-4 w-4" />
      {pending ? 'Applying…' : 'Auto-categorize uncategorized'}
    </Button>
  )
}
