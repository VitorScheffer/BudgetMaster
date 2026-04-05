import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto bg-background pb-16 md:pb-0">
        <div className="container mx-auto max-w-7xl p-4 md:p-6">{children}</div>
      </main>
      <BottomNav />
    </div>
  )
}
