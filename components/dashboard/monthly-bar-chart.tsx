'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAmount } from '@/lib/utils/currency'

interface Props {
  data: { key: string; label: string; income: number; expenses: number }[]
}

export function MonthlyBarChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expenses — 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatAmount(Number(v ?? 0))} tick={{ fontSize: 11 }} width={70} />
            <Tooltip
              formatter={(v, name) => [formatAmount(Number(v ?? 0)), String(name)]}
              contentStyle={{ fontSize: 12, borderRadius: '0.5rem', border: '1px solid oklch(0.912 0.008 264)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
