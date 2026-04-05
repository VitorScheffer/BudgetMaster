'use client'

import { useTransition } from 'react'
import { createCategory } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRef } from 'react'

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899',
  '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#22c55e',
  '#94a3b8', '#6b7280',
]

export function NewCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createCategory(formData)
        toast.success('Category created')
        formRef.current?.reset()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create category')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="e.g. Groceries" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="icon">Emoji icon (optional)</Label>
        <Input id="icon" name="icon" placeholder="🛒" maxLength={4} />
      </div>
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} className="sr-only" defaultChecked={c === '#6b7280'} />
              <span
                className="block h-6 w-6 rounded-full border-2 border-transparent ring-offset-1 hover:ring-2 hover:ring-ring transition-all"
                style={{ background: c }}
              />
            </label>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creating…' : 'Create category'}
      </Button>
    </form>
  )
}
