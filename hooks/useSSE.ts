'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'

type EventHandler = (data: unknown) => void

export function useSSE() {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const clientIdRef = useRef<string | null>(null)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  // Connect to SSE
  useEffect(() => {
    if (!session?.user?.id) return

    const eventSource = new EventSource('/api/sse')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      // EventSource will automatically reconnect
    }

    // Handle connection event to get clientId
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data)
      clientIdRef.current = data.clientId
    })

    // Handle all custom events
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Dispatch to handlers
        handlersRef.current.forEach((handlers) => {
          handlers.forEach((handler) => handler(data))
        })
      } catch {
        // Ignore parse errors
      }
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      clientIdRef.current = null
      setIsConnected(false)
    }
  }, [session?.user?.id])

  // Subscribe to a channel
  const subscribe = useCallback(
    async (channel: string, event: string, handler: EventHandler) => {
      // Add handler
      const key = `${channel}:${event}`
      if (!handlersRef.current.has(key)) {
        handlersRef.current.set(key, new Set())
      }
      handlersRef.current.get(key)!.add(handler)

      // Subscribe on server
      if (clientIdRef.current) {
        await fetch('/api/sse/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientIdRef.current,
            channel,
          }),
        })
      }

      // Add event listener
      if (eventSourceRef.current) {
        const listener = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data)
            handler(data)
          } catch {
            // Ignore
          }
        }
        eventSourceRef.current.addEventListener(event, listener)

        // Return cleanup function
        return () => {
          handlersRef.current.get(key)?.delete(handler)
          eventSourceRef.current?.removeEventListener(event, listener)
        }
      }

      return () => {
        handlersRef.current.get(key)?.delete(handler)
      }
    },
    []
  )

  // Unsubscribe from a channel
  const unsubscribe = useCallback(async (channel: string) => {
    if (clientIdRef.current) {
      await fetch('/api/sse/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdRef.current,
          channel,
          action: 'unsubscribe',
        }),
      })
    }
  }, [])

  return {
    isConnected,
    subscribe,
    unsubscribe,
    clientId: clientIdRef.current,
  }
}
