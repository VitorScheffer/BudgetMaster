'use client'

import { useState, useTransition } from 'react'
import { previewImport, importTransactions } from '@/app/actions/import'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { Account, Currency } from '@/lib/supabase/types'

interface PreviewRow {
  hash: string
  isNew: boolean
  date: string
  description: string
  amount: number
}

type Step = 'select' | 'preview' | 'done'

export function ImportWizard({ accounts }: { accounts: Pick<Account, 'id' | 'name' | 'type' | 'currency'>[] }) {
  const [step, setStep] = useState<Step>('select')
  const [accountId, setAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('')
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [detectedFormat, setDetectedFormat] = useState('')
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedAccount = accounts.find((a) => a.id === accountId)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target?.result as string)
    reader.readAsText(f)
  }

  function handlePreview() {
    if (!accountId || !csvText) return
    startTransition(async () => {
      try {
        const res = await previewImport(accountId, csvText)
        setPreviewRows(res.rows)
        setDetectedFormat(res.format)
        setStep('preview')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Preview failed')
      }
    })
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await importTransactions(accountId, file!.name, csvText)
        setResult(res)
        setStep('done')
        toast.success(`Imported ${res.imported} transactions (${res.skipped} skipped)`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Import failed')
      }
    })
  }

  function reset() {
    setStep('select')
    setFile(null)
    setCsvText('')
    setPreviewRows([])
    setResult(null)
    setAccountId('')
  }

  const newCount = previewRows.filter((r) => r.isNew).length
  const dupCount = previewRows.filter((r) => !r.isNew).length

  return (
    <div className="space-y-4 w-full max-w-3xl">
      {/* Step 1: Select account & file */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 — Select account &amp; file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {accounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need to{' '}
                  <a href="/accounts/new" className="underline">
                    create an account
                  </a>{' '}
                  first.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <Select value={accountId} onValueChange={(v) => setAccountId(v ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account…" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}{' '}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({a.type.replace('_', ' ')} · {a.currency})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">CSV file</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors">
                      <Upload className="h-4 w-4" />
                      {file ? file.name : 'Choose file…'}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    {file && (
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepted: CIBC bank account CSV or CIBC credit card CSV
                  </p>
                </div>

                <Button
                  onClick={handlePreview}
                  disabled={!accountId || !file || pending}
                >
                  {pending ? 'Analysing…' : 'Preview import →'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 — Review transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">
                Detected: <strong className="ml-1">{detectedFormat}</strong>
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800">
                {newCount} new
              </Badge>
              {dupCount > 0 && (
                <Badge variant="secondary">{dupCount} duplicate</Badge>
              )}
            </div>

            <div className="-mx-4 sm:mx-0">
            <div className="overflow-x-auto rounded-md border max-h-96 text-sm">
              <table className="w-full">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Date</th>
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-right px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr
                      key={row.hash}
                      className={row.isNew ? '' : 'opacity-40 bg-muted/30'}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {format(new Date(row.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-3 py-1.5 max-w-xs truncate">{row.description}</td>
                      <td
                        className={`px-3 py-1.5 text-right font-mono ${
                          row.amount < 0 ? 'text-destructive' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(row.amount, selectedAccount?.currency as Currency ?? 'USD')}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {row.isNew ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" />
                        ) : (
                          <span className="text-xs text-muted-foreground">dup</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConfirm} disabled={pending || newCount === 0}>
                {pending ? 'Importing…' : `Import ${newCount} new transactions`}
              </Button>
              <Button variant="ghost" onClick={reset}>
                Start over
              </Button>
            </div>

            {newCount === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>All rows already exist — nothing new to import.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done */}
      {step === 'done' && result && (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <p className="text-lg font-semibold">Import complete</p>
              <p className="text-muted-foreground text-sm mt-1">
                {result.imported} transactions imported · {result.skipped} duplicates skipped
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={reset}>
                Import another file
              </Button>
              <a href="/transactions" className={buttonVariants()}>View transactions</a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
