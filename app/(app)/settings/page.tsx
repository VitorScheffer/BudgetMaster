import { headers } from 'next/headers'
import { getWebhookToken } from '@/app/actions/settings'
import { WebhookSection } from '@/components/settings/webhook-section'

export default async function SettingsPage() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? ''
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const webhookUrl = `${proto}://${host}/api/webhook/email`

  const tokenData = await getWebhookToken()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold md:text-2xl">Settings</h1>
      <WebhookSection initialToken={tokenData?.token ?? null} webhookUrl={webhookUrl} />
    </div>
  )
}
