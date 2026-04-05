'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { detectFormat, parseBankCsv, parseCreditCardCsv } from '@/lib/csv-parser'
import { computeImportHash } from '@/lib/utils/hash'

export interface ImportResult {
  imported: number
  skipped: number
  error?: string
}

export async function importTransactions(
  accountId: string,
  filename: string,
  csvText: string
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify account belongs to user
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (!account) throw new Error('Account not found')

  const format = detectFormat(csvText)
  if (format === 'unknown') return { imported: 0, skipped: 0, error: 'Unrecognized CSV format' }

  const rows = format === 'bank' ? parseBankCsv(csvText) : parseCreditCardCsv(csvText)

  // Build hashes and filter duplicates in one pass
  const rowsWithHash = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      hash: await computeImportHash(user.id, accountId, row.date, row.description, row.amount),
    }))
  )

  // Fetch existing hashes for this user to avoid DB round-trips per row
  const hashes = rowsWithHash.map((r) => r.hash)
  const { data: existing } = await supabase
    .from('transactions')
    .select('import_hash')
    .eq('user_id', user.id)
    .in('import_hash', hashes)

  const existingSet = new Set((existing ?? []).map((e) => e.import_hash))

  const newRows = rowsWithHash.filter((r) => !existingSet.has(r.hash))
  const skipped = rowsWithHash.length - newRows.length

  if (newRows.length === 0) {
    await supabase.from('import_logs').insert({
      user_id: user.id,
      account_id: accountId,
      filename,
      rows_imported: 0,
      rows_skipped: skipped,
    })
    return { imported: 0, skipped }
  }

  // Reconcile: delete pending webhook transactions that CSV rows will replace.
  // Webhook transactions use the email description (short, e.g. "KIRK MARKET") while
  // the CSV has richer text, so their hashes differ. Match by account + amount + date ±3 days.
  const { data: pendingTxs } = await supabase
    .from('transactions')
    .select('id, date, amount')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('is_pending', true)

  if (pendingTxs && pendingTxs.length > 0) {
    const toDelete: string[] = []
    for (const csvRow of newRows) {
      const csvTime = new Date(csvRow.date).getTime()
      const match = pendingTxs.find((p) => {
        if (Math.abs(Number(p.amount) - csvRow.amount) >= 0.005) return false
        return Math.abs(new Date(p.date as string).getTime() - csvTime) <= 3 * 24 * 60 * 60 * 1000
      })
      if (match) toDelete.push(match.id as string)
    }
    if (toDelete.length > 0) {
      await supabase.from('transactions').delete().in('id', toDelete)
    }
  }

  // Fetch category rules to auto-assign categories
  const { data: rules } = await supabase
    .from('category_rules')
    .select('keyword, category_id')
    .eq('user_id', user.id)

  function matchCategory(description: string): string | null {
    if (!rules) return null
    const upper = description.toUpperCase()
    for (const rule of rules) {
      if (upper.includes(rule.keyword.toUpperCase())) return rule.category_id
    }
    return null
  }

  const inserts = newRows.map((row) => ({
    account_id: accountId,
    user_id: user.id,
    date: row.date,
    post_date: row.post_date ?? null,
    description: row.description,
    amount: row.amount,
    cheque_number: row.cheque_number ?? null,
    card_number: row.card_number ?? null,
    running_balance: row.running_balance ?? null,
    import_hash: row.hash,
    category_id: matchCategory(row.description),
    is_transfer: false,
    is_pending: row.is_pending,
  }))

  const { error } = await supabase
    .from('transactions')
    .upsert(inserts, { onConflict: 'user_id,import_hash', ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  await supabase.from('import_logs').insert({
    user_id: user.id,
    account_id: accountId,
    filename,
    rows_imported: newRows.length,
    rows_skipped: skipped,
  })

  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath(`/accounts/${accountId}`)

  return { imported: newRows.length, skipped }
}

export async function previewImport(
  accountId: string,
  csvText: string
): Promise<{ rows: Array<{ hash: string; isNew: boolean; date: string; description: string; amount: number }>; format: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const format = detectFormat(csvText)
  if (format === 'unknown') throw new Error('Unrecognized CSV format')

  const rows = format === 'bank' ? parseBankCsv(csvText) : parseCreditCardCsv(csvText)

  const rowsWithHash = await Promise.all(
    rows.map(async (row) => ({
      hash: await computeImportHash(user.id, accountId, row.date, row.description, row.amount),
      date: row.date,
      description: row.description,
      amount: row.amount,
    }))
  )

  const hashes = rowsWithHash.map((r) => r.hash)
  const { data: existing } = await supabase
    .from('transactions')
    .select('import_hash')
    .eq('user_id', user.id)
    .in('import_hash', hashes)

  const existingSet = new Set((existing ?? []).map((e) => e.import_hash))

  return {
    format,
    rows: rowsWithHash.map((r) => ({ ...r, isNew: !existingSet.has(r.hash) })),
  }
}
