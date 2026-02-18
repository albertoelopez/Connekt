'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface UnreadCounts {
  totalUnread: number
  perConversation: Record<string, number>
  unreadNotifications: number
}

interface UnreadCountsContextValue extends UnreadCounts {
  refetch: () => Promise<void>
}

const UnreadCountsContext = createContext<UnreadCountsContextValue>({
  totalUnread: 0,
  perConversation: {},
  unreadNotifications: 0,
  refetch: async () => {},
})

export function useUnreadCounts() {
  return useContext(UnreadCountsContext)
}

const POLL_INTERVAL = 30000

export function UnreadCountsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [counts, setCounts] = useState<UnreadCounts>({
    totalUnread: 0,
    perConversation: {},
    unreadNotifications: 0,
  })
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations/unread')
      if (response.ok) {
        const data = await response.json()
        setCounts(data)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    fetchCounts()

    pollTimerRef.current = setInterval(fetchCounts, POLL_INTERVAL)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [session?.user?.id, fetchCounts])

  // Listen for visibility changes to refetch when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCounts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchCounts])

  return (
    <UnreadCountsContext.Provider value={{ ...counts, refetch: fetchCounts }}>
      {children}
    </UnreadCountsContext.Provider>
  )
}
