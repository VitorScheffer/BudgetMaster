'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Common banking noise prefixes to strip before extracting a keyword
const NOISE_PREFIXES = [
  'POS PURCHASE', 'POS DEBIT', 'POS CREDIT', 'PURCHASE AT', 'DEBIT CARD PURCHASE',
  'ACH DEBIT', 'ACH CREDIT', 'WIRE TRANSFER', 'DIRECT DEPOSIT', 'DIRECT DEP',
  'RECURRING PMT', 'ONLINE PMT', 'ONLINE PAYMENT', 'BILL PAYMENT', 'POINT OF SALE',
]
const NOISE_WORDS = new Set(['POS', 'ACH', 'DEBIT', 'CREDIT', 'PMT', 'REF', 'TXN', 'INT'])

function extractKeyword(description: string): string {
  let text = description.trim().toUpperCase()

  for (const prefix of NOISE_PREFIXES) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim()
      break
    }
  }

  const parts = text.split(/\s+/)
  const tokens: string[] = []
  for (const part of parts) {
    if (/^\d/.test(part)) break          // stop at reference numbers / dates
    if (tokens.length >= 3) break         // cap at 3 words
    if (NOISE_WORDS.has(part)) continue   // skip stand-alone noise words
    tokens.push(part)
  }

  const keyword = tokens.join(' ').trim()
  return keyword.length >= 3 ? keyword : ''
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null,
): Promise<{ ruleCreated: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch description so we can auto-learn a rule
  const { data: tx } = await supabase
    .from('transactions')
    .select('description')
    .eq('id', transactionId)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('transactions')
    .update({ category_id: categoryId })
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  // Auto-learn: create or update a category rule from this description
  let ruleCreated = false
  if (categoryId && tx?.description) {
    const keyword = extractKeyword(tx.description)
    if (keyword) {
      const { data: existing } = await supabase
        .from('category_rules')
        .select('id, category_id')
        .eq('user_id', user.id)
        .ilike('keyword', keyword)
        .maybeSingle()

      if (!existing) {
        const { error: ruleErr } = await supabase.from('category_rules').insert({
          user_id: user.id,
          category_id: categoryId,
          keyword,
        })
        if (!ruleErr) ruleCreated = true
      } else if (existing.category_id !== categoryId) {
        // Re-assign the rule to the newly selected category
        await supabase
          .from('category_rules')
          .update({ category_id: categoryId })
          .eq('id', existing.id)
          .eq('user_id', user.id)
        ruleCreated = true
      }

      if (ruleCreated) {
        revalidatePath('/categories')
      }
    }
  }

  return { ruleCreated }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function confirmTransfer(txIdA: string, txIdB: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Link both transactions to each other
  const { error: e1 } = await supabase
    .from('transactions')
    .update({ transfer_id: txIdB, is_transfer: true })
    .eq('id', txIdA)
    .eq('user_id', user.id)

  const { error: e2 } = await supabase
    .from('transactions')
    .update({ transfer_id: txIdA, is_transfer: true })
    .eq('id', txIdB)
    .eq('user_id', user.id)

  if (e1 || e2) throw new Error('Failed to link transfer')
  revalidatePath('/transfers')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
}

export async function dismissTransfer(txId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Mark as is_transfer=false with no linked pair — won't be suggested again
  const { error } = await supabase
    .from('transactions')
    .update({ is_transfer: false, transfer_id: null })
    .eq('id', txId)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/transfers')
}

export async function markAsTransferManual(txIdA: string, txIdB: string) {
  return confirmTransfer(txIdA, txIdB)
}

export async function unlinkTransfer(txId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // First find the linked partner
  const { data: tx } = await supabase
    .from('transactions')
    .select('transfer_id')
    .eq('id', txId)
    .eq('user_id', user.id)
    .single()

  if (tx?.transfer_id) {
    await supabase
      .from('transactions')
      .update({ transfer_id: null, is_transfer: false })
      .eq('id', tx.transfer_id)
      .eq('user_id', user.id)
  }

  await supabase
    .from('transactions')
    .update({ transfer_id: null, is_transfer: false })
    .eq('id', txId)
    .eq('user_id', user.id)

  revalidatePath('/transactions')
  revalidatePath('/transfers')
  revalidatePath('/dashboard')
}
