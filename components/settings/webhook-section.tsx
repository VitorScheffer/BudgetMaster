'use client'

import { useState, useTransition } from 'react'
import { generateWebhookToken, revokeWebhookToken } from '@/app/actions/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react'

interface Props {
  initialToken: string | null
  webhookUrl: string
}

export function WebhookSection({ initialToken, webhookUrl }: Props) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [revealed, setRevealed] = useState(false)
  const [pending, startTransition] = useTransition()

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  function handleGenerate() {
    startTransition(async () => {
      try {
        const newToken = await generateWebhookToken()
        setToken(newToken)
        setRevealed(true)
        toast.success('New token generated')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to generate token')
      }
    })
  }

  function handleRevoke() {
    startTransition(async () => {
      try {
        await revokeWebhookToken()
        setToken(null)
        setRevealed(false)
        toast.success('Token revoked')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to revoke token')
      }
    })
  }

  const maskedToken = token
    ? token.slice(0, 8) + '•'.repeat(24) + token.slice(-4)
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Webhook</CardTitle>
        <CardDescription>
          Automatically create transactions from bank notification emails using Gmail Apps Script.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhookUrl} className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(webhookUrl, 'Webhook URL')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bearer Token</Label>
          {token ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={revealed ? token : (maskedToken ?? '')}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copy(token, 'Bearer token')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={pending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRevoke}
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No token yet. Generate one to activate the webhook.</p>
              <Button type="button" onClick={handleGenerate} disabled={pending}>
                Generate Token
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
