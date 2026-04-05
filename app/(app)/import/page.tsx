import { createClient } from '@/lib/supabase/server'
import { ImportWizard } from '@/components/import/import-wizard'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, type, currency')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Import Transactions</h1>
        <p className="text-muted-foreground mt-1">
          Upload a CSV exported from CIBC online banking. Duplicates are automatically skipped.
        </p>
      </div>
      <ImportWizard accounts={accounts ?? []} />
    </div>
  )
}
