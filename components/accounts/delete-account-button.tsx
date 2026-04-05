'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount } from '@/app/actions/accounts'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAccount(accountId)
        toast.success('Account deleted')
        router.push('/accounts')
      } catch {
        toast.error('Failed to delete account')
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={pending}
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 px-2.5 h-7 gap-1 text-[0.8rem] font-medium"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete account
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this account?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the account and all its transactions. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
