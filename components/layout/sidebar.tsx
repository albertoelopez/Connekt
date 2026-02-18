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
  UserCircle,
  UsersRound,
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
    title: 'Connections',
    href: '/connections',
    icon: UsersRound,
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
  {
    title: 'Profile',
    href: '/profile',
    icon: UserCircle,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { totalUnread } = useUnreadCounts()

  return (
    <aside className={cn('w-64 border-r bg-background', className)}>
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const badge = item.href === '/messages' && totalUnread > 0 ? totalUnread : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {badge > 0 && (
                <span className={cn(
                  'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold',
                  isActive
                    ? 'bg-primary-foreground text-primary'
                    : 'bg-destructive text-destructive-foreground'
                )}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
