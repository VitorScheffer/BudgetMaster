import { redirect } from 'next/navigation'

export default function RegisterPage() {
  redirect('/login')
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, oklch(0.97 0.03 264) 0%, oklch(0.99 0.005 264) 40%, oklch(0.97 0.025 300) 100%)' }}
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-black shadow-lg">
            B
          </div>
          <span className="font-extrabold text-xl tracking-tight">BudgetMaster</span>
        </div>
      <Card className="w-full shadow-xl ring-1 ring-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold">Create account</CardTitle>
          <CardDescription>Start tracking your finances today</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
