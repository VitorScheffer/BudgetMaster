import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeImportHash } from '@/lib/utils/hash'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: tokenRow } = await supabase
    .from('webhook_tokens')
    .select('user_id')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userId = tokenRow.user_id as string

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { card_last_four, amount, description, date } = body as {
    card_last_four?: unknown
    amount?: unknown
    description?: unknown
    date?: unknown
  }

  if (
    typeof card_last_four !== 'string' ||
    typeof amount !== 'number' ||
    typeof description !== 'string' ||
    typeof date !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Required fields: card_last_four (string), amount (number), description (string), date (string YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  if (!/^\d{4}$/.test(card_last_four)) {
    return NextResponse.json({ error: 'card_last_four must be exactly 4 digits' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 })
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('card_last_four', card_last_four)
    .single()

  if (!account) {
    return NextResponse.json(
      { error: `No account with card last four '${card_last_four}' found` },
      { status: 404 }
    )
  }

  const { data: rules } = await supabase
    .from('category_rules')
    .select('keyword, category_id')
    .eq('user_id', userId)

  function matchCategory(desc: string): string | null {
    if (!rules) return null
    const upper = desc.toUpperCase()
    for (const rule of rules) {
      if (upper.includes((rule.keyword as string).toUpperCase())) return rule.category_id as string
    }
    return null
  }

  const importHash = await computeImportHash(userId, account.id as string, date, description, amount)

  const { data: inserted, error } = await supabase
    .from('transactions')
    .upsert(
      {
        account_id: account.id,
        user_id: userId,
        date,
        description,
        amount,
        import_hash: importHash,
        category_id: matchCategory(description),
        is_transfer: false,
        is_pending: true,
      },
      { onConflict: 'user_id,import_hash', ignoreDuplicates: true }
    )
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const created = inserted && inserted.length > 0
  return NextResponse.json({ status: created ? 'created' : 'duplicate' })
}
