'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Compass,
  MessageCircle,
  Users,
  HandHeart,
  Calendar,
} from 'lucide-react'
import { useUnreadCounts } from '@/components/providers/unread-counts-provider'

const navItems = [
  {
    title: 'Discover',
    href: '/discover',
    icon: Compass,
  },
  {
    title: 'Messages',
    href: '/messages',
    icon: MessageCircle,
  },
  {
    title: 'Groups',
    href: '/groups',
    icon: Users,
  },
  {
    title: 'Prayers',
    href: '/prayers',
    icon: HandHeart,
  },
  {
    title: 'Events',
    href: '/events',
    icon: Calendar,
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const { totalUnread } = useUnreadCounts()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const badge = item.href === '/messages' && totalUnread > 0 ? totalUnread : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-3 text-xs',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
