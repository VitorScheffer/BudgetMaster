import { parse } from 'papaparse'

export interface ParsedRow {
  date: string        // ISO 8601: YYYY-MM-DD
  post_date: string | null
  description: string
  amount: number
  cheque_number: string | null
  card_number: string | null
  running_balance: number | null
  is_pending: boolean
}

/** Convert DD/MM/YYYY → YYYY-MM-DD */
function parseDate(raw: string): string {
  const [d, m, y] = raw.trim().split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Strip bank-CSV metadata rows and return raw CSV text starting at the data header */
export function stripBankMetadata(csvText: string): string {
  const lines = csvText.split('\n')
  const headerIdx = lines.findIndex((l) => l.trim().startsWith('Date,'))
  if (headerIdx === -1) throw new Error('Could not find data header row in bank CSV')
  return lines.slice(headerIdx).join('\n')
}

/** Strip CC-CSV metadata rows and return raw CSV text starting at the data header */
export function stripCCMetadata(csvText: string): string {
  const lines = csvText.split('\n')
  const headerIdx = lines.findIndex((l) => l.trim().startsWith('Date,'))
  if (headerIdx === -1) throw new Error('Could not find data header row in CC CSV')
  return lines.slice(headerIdx).join('\n')
}

export type CsvFormat = 'bank' | 'credit_card' | 'unknown'

/** Detect CSV format from raw text */
export function detectFormat(csvText: string): CsvFormat {
  if (csvText.includes('Cheque Number')) return 'bank'
  if (csvText.includes('Post Date') && csvText.includes('Card No.')) return 'credit_card'
  return 'unknown'
}

/** Parse a bank account CSV (CIBC Chequing/Savings) */
export function parseBankCsv(csvText: string): ParsedRow[] {
  const cleaned = stripBankMetadata(csvText)
  const { data, errors } = parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  })

  if (errors.length > 0 && data.length === 0) {
    throw new Error(`Bank CSV parse error: ${errors[0].message}`)
  }

  return data
    .filter((row) => row['Date'] && row['Description'])
    .map((row) => {
      const debit = parseFloat(row['Debit Amount'] || '0') || 0
      const credit = parseFloat(row['Credit Amount'] || '0') || 0
      // debit column already contains negative sign (e.g. -25.00), credit is positive
      const amount = credit + debit

      return {
        date: parseDate(row['Date']),
        post_date: null,
        description: row['Description'],
        amount,
        cheque_number: row['Cheque Number'] || null,
        card_number: null,
        running_balance: parseFloat(row['Running Balance'] || '') || null,
        is_pending: false,
      }
    })
}

/** Parse a credit card CSV (CIBC Credit Card) */
export function parseCreditCardCsv(csvText: string): ParsedRow[] {
  const cleaned = stripCCMetadata(csvText)

  // Use header:false because duplicate "Amount (USD)" columns would collide.
  // We access columns by index directly.
  const { data, errors } = parse<string[]>(cleaned, {
    header: false,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  })

  if (errors.length > 0 && data.length === 0) {
    throw new Error(`CC CSV parse error: ${errors[0].message}`)
  }

  // Skip the header row (index 0): Date, Post Date, Card No., Description, Amount (USD), Amount (USD)
  return data
    .slice(1)
    .filter((row) => row[0] && row[3])
    .map((row) => {
      const isPending = row[1]?.toLowerCase() === 'pending'
      const rawPostDate = isPending ? null : row[1]
      // Index 5 is the actual charged amount; index 4 is 0 for pending
      const rawAmount = row[5] || row[4] || '0'
      // CC charges are expenses → negative amount
      const amount = -(parseFloat(rawAmount) || 0)

      return {
        date: parseDate(row[0]),
        post_date: rawPostDate ? parseDate(rawPostDate) : null,
        description: row[3],
        amount,
        cheque_number: null,
        card_number: row[2] || null,
        running_balance: null,
        is_pending: isPending,
      }
    })
}
