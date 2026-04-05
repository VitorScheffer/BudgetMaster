'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatAmount } from '@/lib/utils/currency'

interface Props {
  data: { key: string; label: string; net: number }[]
}

export function BalanceTrendChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Balance Trend — 12 months</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => formatAmount(v)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip
              formatter={(v) => [formatAmount(Number(v ?? 0)), 'Cumulative net']}
              contentStyle={{ fontSize: 12, borderRadius: '0.5rem', border: '1px solid oklch(0.912 0.008 264)' }}
            />
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 3" strokeOpacity={0.7} />
            <Area
              type="monotone"
              dataKey="net"
              name="Net balance"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#netGradient)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
