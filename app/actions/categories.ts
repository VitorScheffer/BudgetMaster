'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    color: formData.get('color') as string || '#6b7280',
    icon: formData.get('icon') as string || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}

export async function updateCategory(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .update({
      name: formData.get('name') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}

export async function createCategoryRule(categoryId: string, keyword: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('category_rules').insert({
    user_id: user.id,
    category_id: categoryId,
    keyword: keyword.trim(),
  })

  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}

export async function deleteCategoryRule(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('category_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/categories')
}

export async function applyCategoriesToUncategorized() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [{ data: uncategorized }, { data: rules }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, description')
      .eq('user_id', user.id)
      .is('category_id', null),
    supabase
      .from('category_rules')
      .select('keyword, category_id')
      .eq('user_id', user.id),
  ])

  if (!uncategorized || !rules || uncategorized.length === 0) return { updated: 0 }

  // Group transactions by matched category to batch updates
  const byCategory = new Map<string, string[]>()
  for (const tx of uncategorized) {
    const upper = tx.description.toUpperCase()
    const match = rules.find((r) => upper.includes(r.keyword.toUpperCase()))
    if (match) {
      const ids = byCategory.get(match.category_id) ?? []
      ids.push(tx.id)
      byCategory.set(match.category_id, ids)
    }
  }

  if (byCategory.size === 0) return { updated: 0 }

  let updated = 0
  for (const [category_id, ids] of byCategory) {
    const { error } = await supabase
      .from('transactions')
      .update({ category_id })
      .in('id', ids)
      .eq('user_id', user.id)
    if (!error) updated += ids.length
  }

  revalidatePath('/transactions')
  revalidatePath('/dashboard')

  return { updated }
}

const DEFAULT_CATEGORIES = [
  {
    name: 'Food & Dining', color: '#f97316',
    rules: ['UBER *EATS', 'DOORDASH', 'GRUBHUB', 'SEAMLESS', 'INSTACART', 'KIRK MARKET', 'FOSTER', 'GREEN MACHINE', 'COST U LESS'],
  },
  {
    name: 'Restaurants', color: '#fb923c',
    rules: ['MCDONALD', 'BURGER KING', 'WENDY', 'SUBWAY', 'KFC', 'TACO BELL', 'PIZZA HUT', 'DOMINO', 'CHICK-FIL', 'CHIPOTLE', 'STARBUCKS', 'DUNKIN', 'PANERA', 'OLIVE GARDEN', 'APPLEBEE', 'DENNY'],
  },
  {
    name: 'Groceries', color: '#f59e0b',
    rules: ['WALMART', 'TARGET', 'WHOLE FOODS', 'TRADER JOE', 'KROGER', 'PUBLIX', 'SAFEWAY', 'ALDI', 'COSTCO', 'RUBIS SUPERMARKET', 'FOSTER\'S FOOD', 'HURLEY\'S'],
  },
  {
    name: 'Fuel & Gas', color: '#dc2626',
    rules: ['SHELL', 'EXXON', 'MOBIL', 'CHEVRON', 'BP ', 'SUNOCO', 'TEXACO', 'RUBIS GAS', 'ESSO', 'MARATHON', 'CIRCLE K', 'FUEL', 'GAS STATION'],
  },
  {
    name: 'Transport', color: '#3b82f6',
    rules: ['UBER *TRIP', 'UBER*RIDES', 'DL *UBER', 'LYFT', 'TAXI', 'CAB ', 'BUS FARE', 'CAYMAN AIRWAYS', 'AMERICAN AIRLINES', 'DELTA AIR', 'UNITED AIR'],
  },
  {
    name: 'Utilities', color: '#06b6d4',
    rules: ['WATER AUTHORITY', 'CUC ', 'CARIBBEAN UTILITIES', 'CAYMAN WATER', 'LOGIC ', 'FLOW ', 'DIGICEL', 'C&W ', 'CABLE & WIRELESS', 'ELECTRICITY', 'GAS COMPANY'],
  },
  {
    name: 'Internet & Phone', color: '#0ea5e9',
    rules: ['COMCAST', 'AT&T', 'VERIZON', 'T-MOBILE', 'SPECTRUM', 'COX COMM', 'CHARTER', 'WINDSTREAM', 'CENTURYLINK', 'LOGIC BROADBAND', 'FLOW CAYMAN', 'CELL PHONE', 'MOBILE PLAN'],
  },
  {
    name: 'Subscriptions', color: '#a855f7',
    rules: ['NETFLIX', 'SPOTIFY', 'DISNEY+', 'HULU', 'HBO MAX', 'APPLE.COM', 'GOOGLE ONE', 'AMAZON PRIME', 'YOUTUBE PREMIUM', 'LINKEDIN', 'DROPBOX', 'ICLOUD'],
  },
  {
    name: 'Housing', color: '#8b5cf6',
    rules: ['RENT PAYMENT', 'MORTGAGE', 'HOA FEE', 'PROPERTY TAX'],
  },
  {
    name: 'Insurance', color: '#7c3aed',
    rules: ['GEICO', 'STATE FARM', 'ALLSTATE', 'PROGRESSIVE', 'USAA INS', 'AAA INS', 'INSURANCE PMT', 'CAYMAN GENERAL', 'SAGICOR', 'BRITISH CALEDONIAN'],
  },
  {
    name: 'Health & Medical', color: '#10b981',
    rules: ['CVS PHARMACY', 'WALGREENS', 'RITE AID', 'PHARMACY', 'DOCTOR', 'HOSPITAL', 'DENTAL', 'VISION', 'HEALTH INS', 'OPTOMETRIST', 'CAYMAN ISLANDS HOSPITAL'],
  },
  {
    name: 'Fitness', color: '#34d399',
    rules: ['PLANET FITNESS', 'GOLD\'S GYM', '24 HOUR FITNESS', 'CROSSFIT', 'EQUINOX', 'GYM MBSHIP', 'YMCA', 'ANYTIME FITNESS'],
  },
  {
    name: 'Entertainment', color: '#ec4899',
    rules: ['AMC ', 'REGAL CINEMA', 'CINEMARK', 'TICKETMASTER', 'EVENTBRITE', 'MOVIE', 'THEATRE', 'CONCERT'],
  },
  {
    name: 'Shopping', color: '#f472b6',
    rules: ['AMAZON.COM', 'EBAY', 'ETSY', 'BEST BUY', 'HOME DEPOT', 'LOWE\'S', 'IKEA', 'ZARA', 'H&M ', 'GAP ', 'OLD NAVY', 'MARSHALLS', 'TJ MAXX'],
  },
  {
    name: 'Software & Tech', color: '#6366f1',
    rules: ['ANTHROPIC', 'OPENAI', 'CHATGPT', 'SLACK', 'ZOHO', 'GODADDY', 'AWS ', 'GOOGLE CLOUD', 'GITHUB', 'VERCEL', 'DIGITALOCEAN', 'CLOUDFLARE', 'ADOBE', 'MICROSOFT 365', 'OFFICE 365'],
  },
  {
    name: 'Education', color: '#0891b2',
    rules: ['UDEMY', 'COURSERA', 'SKILLSHARE', 'PLURALSIGHT', 'TUITION', 'SCHOOL FEE', 'UNIVERSITY', 'COLLEGE'],
  },
  {
    name: 'Travel', color: '#14b8a6',
    rules: ['AIRBNB', 'HOTELS.COM', 'EXPEDIA', 'BOOKING.COM', 'MARRIOTT', 'HILTON', 'HYATT', 'ENTERPRISE', 'HERTZ', 'AVIS CAR'],
  },
  {
    name: 'Income', color: '#22c55e',
    rules: ['PAYROLL', 'DIRECT DEP', 'SALARY', 'WAGES', 'FREELANCE PMT', 'INVOICE PMT'],
  },
  {
    name: 'Transfer', color: '#94a3b8',
    rules: ['WISE', 'CIBC FCIB CREDIT CARD', 'ZELLE', 'VENMO', 'CASHAPP', 'PAYPAL TRANSFER', 'ACH TRANSFER'],
  },
  {
    name: 'Other', color: '#6b7280',
    rules: [],
  },
]

export async function seedDefaultCategories(): Promise<{ seeded: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Only seed if the user has no categories at all
  const { count } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) > 0) return { seeded: false }

  for (const def of DEFAULT_CATEGORIES) {
    const { data: cat, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: def.name, color: def.color, is_default: true })
      .select('id')
      .single()
    if (error || !cat) continue

    if (def.rules.length > 0) {
      await supabase.from('category_rules').insert(
        def.rules.map((keyword) => ({ user_id: user.id, category_id: cat.id, keyword }))
      )
    }
  }

  revalidatePath('/categories')
  return { seeded: true }
}

export async function syncDefaultCategories(): Promise<{ added: number; rulesAdded: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', user.id)

  const existingNames = new Set((existing ?? []).map((c) => c.name.toLowerCase()))

  let added = 0
  let rulesAdded = 0

  for (const def of DEFAULT_CATEGORIES) {
    if (existingNames.has(def.name.toLowerCase())) {
      // Category already exists — add any missing rules
      const existingCat = (existing ?? []).find(
        (c) => c.name.toLowerCase() === def.name.toLowerCase()
      )
      if (existingCat && def.rules.length > 0) {
        const { data: existingRules } = await supabase
          .from('category_rules')
          .select('keyword')
          .eq('user_id', user.id)
          .eq('category_id', existingCat.id)

        const existingKeywords = new Set(
          (existingRules ?? []).map((r) => r.keyword.toUpperCase())
        )
        const newRules = def.rules.filter(
          (k) => !existingKeywords.has(k.toUpperCase())
        )
        if (newRules.length > 0) {
          const { error } = await supabase.from('category_rules').insert(
            newRules.map((keyword) => ({
              user_id: user.id,
              category_id: existingCat.id,
              keyword,
            }))
          )
          if (!error) rulesAdded += newRules.length
        }
      }
      continue
    }

    // New category — insert it with all its rules
    const { data: cat, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: def.name, color: def.color, is_default: true })
      .select('id')
      .single()
    if (error || !cat) continue
    added++

    if (def.rules.length > 0) {
      const { error: ruleErr } = await supabase.from('category_rules').insert(
        def.rules.map((keyword) => ({ user_id: user.id, category_id: cat.id, keyword }))
      )
      if (!ruleErr) rulesAdded += def.rules.length
    }
  }

  revalidatePath('/categories')
  return { added, rulesAdded }
}
