import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={session.user} />
      <div className="flex">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="container max-w-6xl py-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
