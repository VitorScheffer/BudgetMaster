'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

interface Props {
  data: { id: string; name: string; color: string; amount: number }[]
  selectedMonth: string
}

export function CategoryDonutChart({ data, selectedMonth }: Props) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category — {selectedMonth}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
            No expense data for this month
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              {/* Center label rendered via foreignObject alternative — use absolute overlay */}
              <Tooltip
                formatter={(value, name) => {
                  const v = Number(value ?? 0)
                  return [
                    `${formatCurrency(v, 'USD')} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`,
                    String(name),
                  ]
                }}
                contentStyle={{ fontSize: 12, borderRadius: '0.5rem', border: '1px solid oklch(0.912 0.008 264)' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value, entry) => {
                  const payload = entry.payload as unknown as { amount: number }
                  return `${value} — ${formatCurrency(payload.amount, 'USD')}`
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {data.length > 0 && (
          <p className="text-center -mt-2 text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatCurrency(total, 'USD')}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
