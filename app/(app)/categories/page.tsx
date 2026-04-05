import { createClient } from '@/lib/supabase/server'
import { CategoryList } from '@/components/categories/category-list'
import { NewCategoryForm } from '@/components/categories/new-category-form'
import { ApplyCategoriesButton } from '@/components/categories/apply-categories-button'
import { SeedCategoriesButton } from '@/components/categories/seed-categories-button'
import { SyncCategoriesButton } from '@/components/categories/sync-categories-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default async function CategoriesPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('category_rules')
      .select('id, keyword, category_id')
      .order('keyword'),
  ])

  const rulesByCategory: Record<string, { id: string; keyword: string }[]> = {}
  for (const rule of rules ?? []) {
    if (!rulesByCategory[rule.category_id]) rulesByCategory[rule.category_id] = []
    rulesByCategory[rule.category_id].push({ id: rule.id, keyword: rule.keyword })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold md:text-2xl">Categories</h1>
      <div className="flex flex-wrap items-center gap-2">
        {(categories ?? []).length === 0 && <SeedCategoriesButton />}
        <SyncCategoriesButton />
        <ApplyCategoriesButton />
      </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <NewCategoryForm />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <CategoryList
              categories={categories ?? []}
              rulesByCategory={rulesByCategory}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
