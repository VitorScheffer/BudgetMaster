'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount, updateAccount } from '@/app/actions/accounts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Account } from '@/lib/supabase/types'

interface Props {
  account?: Account
}

export function AccountForm({ account }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (account) {
          await updateAccount(account.id, formData)
          toast.success('Account updated')
        } else {
          await createAccount(formData)
          toast.success('Account created')
        }
        router.push('/accounts')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="name">Account name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={account?.name}
          placeholder="e.g. CIBC Chequing"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Account type</Label>
        <Select name="type" defaultValue={account?.type ?? 'checking'} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select name="currency" defaultValue={account?.currency ?? 'USD'} required>
          <SelectTrigger id="currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD — US Dollar</SelectItem>
            <SelectItem value="KYD">KYD — Cayman Islands Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="card_last_four">Card last 4 digits <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="card_last_four"
          name="card_last_four"
          defaultValue={account?.card_last_four ?? ''}
          placeholder="e.g. 3639"
          maxLength={4}
          pattern="\d{4}"
          inputMode="numeric"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : account ? 'Save changes' : 'Create account'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/accounts')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
