'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, parse } from 'date-fns'

export function MonthPicker({ selectedMonth }: { selectedMonth: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const current = parse(selectedMonth, 'yyyy-MM', new Date())
  const today = new Date()

  function navigate(date: Date) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', format(date, 'yyyy-MM'))
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(subMonths(current, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="w-28 text-center font-medium text-sm">
        {format(current, 'MMMM yyyy')}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigate(addMonths(current, 1))}
        disabled={format(addMonths(current, 1), 'yyyy-MM') > format(today, 'yyyy-MM')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
