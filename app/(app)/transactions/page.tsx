import { createClient } from '@/lib/supabase/server'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { TransactionFilters } from '@/components/transactions/transaction-filters'

interface SearchParams {
  account?: string
  category?: string
  from?: string
  to?: string
  page?: string
  search?: string
  type?: string
}

const PAGE_SIZE = 50

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // Fetch accounts and categories for filters
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from('accounts').select('id, name').order('name'),
    supabase.from('categories').select('id, name, color').order('name'),
  ])

  // Build query
  let query = supabase
    .from('transactions')
    .select('*, categories(id, name, color), accounts(id, name, type, currency)', {
      count: 'exact',
    })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.account) query = query.eq('account_id', params.account)
  if (params.category) query = query.eq('category_id', params.category)
  if (params.from) query = query.gte('date', params.from)
  if (params.to) query = query.lte('date', params.to)
  if (params.search) query = query.ilike('description', `%${params.search}%`)
  if (params.type === 'income') query = query.gt('amount', 0)
  if (params.type === 'expense') query = query.lt('amount', 0)
  if (params.type === 'transfer') query = query.eq('is_transfer', true)

  const { data: transactions, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Transactions</h1>
      <TransactionFilters
        accounts={accounts ?? []}
        categories={categories ?? []}
        current={params}
      />
      <TransactionTable
        transactions={transactions ?? []}
        categories={categories ?? []}
        page={page}
        totalPages={totalPages}
        total={count ?? 0}
      />
    </div>
  )
}
