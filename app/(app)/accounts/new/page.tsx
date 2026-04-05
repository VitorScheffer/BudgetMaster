import { AccountForm } from '@/components/accounts/account-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">New Account</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountForm />
        </CardContent>
      </Card>
    </div>
  )
}
