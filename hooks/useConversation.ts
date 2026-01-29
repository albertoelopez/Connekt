'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE } from './useSSE'
import type { MessageWithSender } from '@/types'

interface UseConversationOptions {
  conversationId: string
  enabled?: boolean
}

export function useConversation({
  conversationId,
  enabled = true,
}: UseConversationOptions) {
  const { subscribe, unsubscribe, isConnected } = useSSE()
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [isTyping, setIsTyping] = useState<{
    userId: string
    userName: string
  } | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      )
      const data = await response.json()
      if (response.ok) {
        setMessages(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }, [conversationId])

  // Handle new message
  const handleNewMessage = useCallback((data: unknown) => {
    const message = data as MessageWithSender
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.id === message.id)) return prev
      return [...prev, message]
    })
  }, [])

  // Handle typing indicator
  const handleTypingStart = useCallback(
    (data: unknown) => {
      const typingData = data as { userId: string; userName: string }
      setIsTyping(typingData)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(null)
      }, 3000)
    },
    []
  )

  const handleTypingStop = useCallback(() => {
    setIsTyping(null)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // Subscribe to channel
  useEffect(() => {
    if (!enabled || !conversationId || !isConnected) return

    fetchMessages()

    const channel = `conversation-${conversationId}`

    // Subscribe to events
    const setupSubscriptions = async () => {
      const cleanup1 = await subscribe(channel, 'new-message', handleNewMessage)
      const cleanup2 = await subscribe(
        channel,
        'typing-start',
        handleTypingStart
      )
      const cleanup3 = await subscribe(channel, 'typing-stop', handleTypingStop)

      cleanupRef.current = [cleanup1, cleanup2, cleanup3].filter(
        Boolean
      ) as (() => void)[]
    }

    setupSubscriptions()

    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup?.())
      cleanupRef.current = []
      unsubscribe(channel)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [
    conversationId,
    enabled,
    isConnected,
    subscribe,
    unsubscribe,
    fetchMessages,
    handleNewMessage,
    handleTypingStart,
    handleTypingStop,
  ])

  // Send message
  const sendMessage = useCallback(
    async (content: string, replyToId?: string) => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, replyToId }),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        const message = await response.json()
        return message
      } catch (error) {
        console.error('Failed to send message:', error)
        throw error
      }
    },
    [conversationId]
  )

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      try {
        await fetch(`/api/conversations/${conversationId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping }),
        })
      } catch {
        // Silently fail for typing indicators
      }
    },
    [conversationId]
  )

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    sendTypingIndicator,
    refreshMessages: fetchMessages,
  }
}
