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

  // Totals query (same filters, amounts only — no pagination)
  let totalsQuery = supabase.from('transactions').select('amount')

  // Apply shared filters
  function applyFilters<T>(q: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let b: any = q
    if (params.account) b = b.eq('account_id', params.account)
    if (params.category === 'uncategorized') b = b.is('category_id', null)
    else if (params.category) b = b.eq('category_id', params.category)
    if (params.from) b = b.gte('date', params.from)
    if (params.to) b = b.lte('date', params.to)
    if (params.search) b = b.ilike('description', `%${params.search}%`)
    if (params.type === 'income') b = b.gt('amount', 0)
    if (params.type === 'expense') b = b.lt('amount', 0)
    if (params.type === 'transfer') b = b.eq('is_transfer', true)
    return b
  }

  query = applyFilters(query)
  totalsQuery = applyFilters(totalsQuery)

  // Exclude transfers from income/expense totals unless the user is explicitly
  // filtering by type=transfer (transfers are not real income or expenses)
  if (params.type !== 'transfer') {
    totalsQuery = totalsQuery.eq('is_transfer', false)
  }

  const [{ data: transactions, count }, { data: amountData }] = await Promise.all([
    query,
    totalsQuery,
  ])

  const incomeTotal = amountData?.reduce((a, r) => (r.amount > 0 ? a + r.amount : a), 0) ?? 0
  const expenseTotal = amountData?.reduce((a, r) => (r.amount < 0 ? a + r.amount : a), 0) ?? 0

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
        incomeTotal={incomeTotal}
        expenseTotal={expenseTotal}
      />
    </div>
  )
}
