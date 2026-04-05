'use client'

import { useTransition } from 'react'
import { seedDefaultCategories } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'

export function SeedCategoriesButton() {
  const [pending, startTransition] = useTransition()

  function handleSeed() {
    startTransition(async () => {
      try {
        const result = await seedDefaultCategories()
        if (result.seeded) {
          toast.success('Default categories and rules created')
        } else {
          toast.info('Categories already exist — nothing to seed')
        }
      } catch {
        toast.error('Failed to seed categories')
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleSeed} disabled={pending}>
      <Sparkles className="mr-2 h-4 w-4" />
      {pending ? 'Seeding…' : 'Seed default categories'}
    </Button>
  )
}
