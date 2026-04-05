'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AccountType, Currency } from '@/lib/supabase/types'

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cardLastFour = (formData.get('card_last_four') as string | null)?.trim() || null

  const { error } = await supabase.from('accounts').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    type: formData.get('type') as AccountType,
    currency: formData.get('currency') as Currency,
    card_last_four: cardLastFour,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/accounts')
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const cardLastFour = (formData.get('card_last_four') as string | null)?.trim() || null

  const { error } = await supabase
    .from('accounts')
    .update({
      name: formData.get('name') as string,
      type: formData.get('type') as AccountType,
      currency: formData.get('currency') as Currency,
      card_last_four: cardLastFour,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/accounts')
  revalidatePath(`/accounts/${id}`)
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/accounts')
}
