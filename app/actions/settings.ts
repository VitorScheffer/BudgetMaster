'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getWebhookToken(): Promise<{ id: string; token: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('webhook_tokens')
    .select('id, token')
    .eq('user_id', user.id)
    .single()

  return data ?? null
}

export async function generateWebhookToken(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Remove any existing token first (one per user)
  await supabase.from('webhook_tokens').delete().eq('user_id', user.id)

  const { error } = await supabase.from('webhook_tokens').insert({
    user_id: user.id,
    token,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
  return token
}

export async function revokeWebhookToken(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('webhook_tokens')
    .delete()
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}
