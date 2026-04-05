export type AccountType = 'checking' | 'savings' | 'credit_card'
export type Currency = 'USD' | 'KYD'

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: AccountType
          currency: Currency
          card_last_four: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          user_id: string
          date: string
          post_date: string | null
          description: string
          amount: number
          cheque_number: string | null
          card_number: string | null
          running_balance: number | null
          import_hash: string
          category_id: string | null
          transfer_id: string | null
          is_transfer: boolean
          is_pending: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string | null
          is_default: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      category_rules: {
        Row: {
          id: string
          user_id: string
          category_id: string
          keyword: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['category_rules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['category_rules']['Insert']>
      }
      import_logs: {
        Row: {
          id: string
          user_id: string
          account_id: string
          filename: string
          rows_imported: number
          rows_skipped: number
          imported_at: string
        }
        Insert: Omit<Database['public']['Tables']['import_logs']['Row'], 'id' | 'imported_at'>
        Update: never
      }
      webhook_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          label: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['webhook_tokens']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['webhook_tokens']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience aliases
export type Account = Database['public']['Tables']['accounts']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryRule = Database['public']['Tables']['category_rules']['Row']
export type ImportLog = Database['public']['Tables']['import_logs']['Row']

export type TransactionWithCategory = Transaction & {
  categories: Pick<Category, 'id' | 'name' | 'color'> | null
}

export type TransactionWithAccount = Transaction & {
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'currency'>
}
