/**
 * Computes a deterministic import hash for deduplication.
 * Uses Web Crypto API (available in both browser and Node/Edge runtimes).
 */
export async function computeImportHash(
  userId: string,
  accountId: string,
  date: string,
  description: string,
  amount: number
): Promise<string> {
  const raw = `${userId}|${accountId}|${date}|${description.trim()}|${amount.toFixed(2)}`
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
