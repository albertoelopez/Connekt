'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConversationList } from '@/components/messaging/conversation-list'
import { ChatView } from '@/components/messaging/chat-view'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageCircle } from 'lucide-react'

interface Conversation {
  id: string
  type: string
  otherUser: {
    id: string
    name: string
    image: string | null
    isOnline: boolean
    lastSeen: string
  } | null
  group: {
    id: string
    name: string
    image: string | null
  } | null
  lastMessage: {
    content: string
    createdAt: string
    sender: {
      id: string
      name: string
    }
  } | null
  updatedAt: string
}

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get('userId')
  const conversationIdParam = searchParams.get('conversationId')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  // Handle deep link to open a specific conversation
  useEffect(() => {
    if (conversationIdParam && !loading) {
      setSelectedConversation(conversationIdParam)
      // Clear the conversationId param from URL
      router.replace('/messages')
    }
  }, [conversationIdParam, loading, router])

  // Handle deep link to start conversation with specific user
  useEffect(() => {
    if (userIdParam && !loading) {
      startConversation(userIdParam)
    }
  }, [userIdParam, loading])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      if (response.ok) {
        setConversations(data)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const startConversation = async (participantId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      })

      if (response.ok) {
        const conversation = await response.json()
        setSelectedConversation(conversation.id)
        await fetchConversations()
        // Clear the userId param
        router.replace('/messages')
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        <Skeleton className="w-80 h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      <div className="w-80 border rounded-lg overflow-hidden flex-shrink-0 hidden md:block">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation}
          onSelect={setSelectedConversation}
        />
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden">
        {selectedConversation ? (
          <ChatView
            conversationId={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Your Messages</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Select a conversation from the list or start a new one from a user&apos;s profile
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
