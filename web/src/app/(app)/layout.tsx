import { ProtectedRoute } from '@/components/protected-route'
import { BottomNav } from '@/components/bottom-nav'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { NotificationModal } from '@/components/notification-modal'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <AppHeader />
        <main className="flex-1 pb-20">
          {children}
          <AppFooter />
        </main>
        <BottomNav />
      </div>
      <NotificationModal />
    </ProtectedRoute>
  )
}
