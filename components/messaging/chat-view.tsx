'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useConversation } from '@/hooks/useConversation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials, formatRelativeTime, cn } from '@/lib/utils'
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { useUnreadCounts } from '@/components/providers/unread-counts-provider'

interface ChatViewProps {
  conversationId: string
  onBack?: () => void
}

interface ConversationInfo {
  id: string
  type: string
  otherUser?: {
    id: string
    name: string
    image: string | null
    isOnline: boolean
    lastSeen: string
  }
  group?: {
    id: string
    name: string
    image: string | null
  }
}

export function ChatView({ conversationId, onBack }: ChatViewProps) {
  const { data: session } = useSession()
  const { messages, isTyping, sendMessage, sendTypingIndicator } = useConversation({
    conversationId,
  })
  const { refetch: refetchUnread } = useUnreadCounts()

  const [info, setInfo] = useState<ConversationInfo | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchConversationInfo()
    // Refetch unread counts when opening a conversation (messages get marked as read)
    const timer = setTimeout(refetchUnread, 500)
    return () => clearTimeout(timer)
  }, [conversationId])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const fetchConversationInfo = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      const conv = data.find((c: any) => c.id === conversationId)
      if (conv) {
        setInfo({
          id: conv.id,
          type: conv.type,
          otherUser: conv.otherUser,
          group: conv.group,
        })
      }
    } catch (error) {
      console.error('Failed to fetch conversation info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await sendMessage(newMessage.trim())
      setNewMessage('')
      sendTypingIndicator(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)

    // Send typing indicator
    sendTypingIndicator(true)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false)
    }, 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Skeleton className="h-16 m-4" />
        <div className="flex-1" />
        <Skeleton className="h-12 m-4" />
      </div>
    )
  }

  const displayName = info?.type === 'DIRECT' ? info?.otherUser?.name : info?.group?.name
  const displayImage = info?.type === 'DIRECT' ? info?.otherUser?.image : info?.group?.image
  const isOnline = info?.type === 'DIRECT' ? info?.otherUser?.isOnline : false

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Link
          href={
            info?.type === 'DIRECT'
              ? `/profile/${info?.otherUser?.id}`
              : `/groups/${info?.group?.id}`
          }
          className="flex items-center gap-3 flex-1"
        >
          <div className="relative">
            <Avatar>
              <AvatarImage src={displayImage || undefined} alt={displayName || ''} />
              <AvatarFallback>{getInitials(displayName || '')}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            {info?.type === 'DIRECT' && (
              <p className="text-xs text-muted-foreground">
                {isOnline
                  ? 'Online'
                  : `Last seen ${formatRelativeTime(info?.otherUser?.lastSeen || '')}`}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwnMessage = message.sender.id === session?.user?.id

            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  isOwnMessage && 'flex-row-reverse'
                )}
              >
                {!isOwnMessage && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender.image || undefined} />
                    <AvatarFallback>
                      {getInitials(message.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[70%] rounded-lg px-3 py-2',
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.replyTo && (
                    <div
                      className={cn(
                        'text-xs mb-1 pb-1 border-b',
                        isOwnMessage
                          ? 'border-primary-foreground/30'
                          : 'border-border'
                      )}
                    >
                      <span className="font-medium">
                        {message.replyTo.sender.name}:
                      </span>{' '}
                      {message.replyTo.content.substring(0, 50)}
                      {message.replyTo.content.length > 50 && '...'}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-1',
                      isOwnMessage
                        ? 'text-primary-foreground/70 justify-end'
                        : 'text-muted-foreground'
                    )}
                  >
                    <span className="text-xs">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                    {isOwnMessage && (
                      message.readBy && message.readBy.length > 0 ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(isTyping.userName)}</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce animation-delay-100">.</span>
                  <span className="animate-bounce animation-delay-200">.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
