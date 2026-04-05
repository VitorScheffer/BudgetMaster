'use client'

import { useState, useTransition } from 'react'
import { deleteCategory, createCategoryRule, deleteCategoryRule } from '@/app/actions/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import type { Category } from '@/lib/supabase/types'

interface Props {
  categories: Category[]
  rulesByCategory: Record<string, { id: string; keyword: string }[]>
}

export function CategoryList({ categories, rulesByCategory }: Props) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>
  }

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <CategoryRow
          key={cat.id}
          category={cat}
          rules={rulesByCategory[cat.id] ?? []}
        />
      ))}
    </div>
  )
}

function CategoryRow({
  category,
  rules,
}: {
  category: Category
  rules: { id: string; keyword: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCategory(category.id)
        toast.success('Category deleted')
      } catch {
        toast.error('Failed to delete category')
      }
    })
  }

  function handleAddRule() {
    const keyword = newKeyword.trim()
    if (!keyword) return
    startTransition(async () => {
      try {
        await createCategoryRule(category.id, keyword)
        toast.success('Rule added')
        setNewKeyword('')
      } catch {
        toast.error('Failed to add rule')
      }
    })
  }

  function handleDeleteRule(ruleId: string) {
    startTransition(async () => {
      try {
        await deleteCategoryRule(ruleId)
        toast.success('Rule removed')
      } catch {
        toast.error('Failed to remove rule')
      }
    })
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ background: category.color }}
        />
        <span className="text-sm font-medium flex-1">
          {category.icon && <span className="mr-1">{category.icon}</span>}
          {category.name}
        </span>
        <Badge variant="secondary" className="text-xs">
          {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </Badge>
        {!category.is_default && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Keyword rules — matches description (case-insensitive)
          </p>
          <div className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <span
                key={rule.id}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium"
              >
                {rule.keyword}
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  disabled={pending}
                  className="text-muted-foreground hover:text-destructive ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Keyword (e.g. UBER)"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleAddRule()}
            />
            <Button
              size="sm"
              onClick={handleAddRule}
              disabled={!newKeyword.trim() || pending}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
