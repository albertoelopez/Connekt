'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn, getInitials, formatRelativeTime, truncate } from '@/lib/utils'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useUnreadCounts } from '@/components/providers/unread-counts-provider'

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

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { perConversation } = useUnreadCounts()

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.type === 'DIRECT' ? conv.otherUser?.name : conv.group?.name
    return name?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const unreadCount = perConversation[conversation.id] || 0
            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  'w-full p-4 flex items-start gap-3 hover:bg-accent transition-colors text-left',
                  selectedId === conversation.id && 'bg-accent'
                )}
              >
                <div className="relative">
                  <Avatar>
                    {conversation.type === 'DIRECT' ? (
                      <>
                        <AvatarImage
                          src={conversation.otherUser?.image || undefined}
                          alt={conversation.otherUser?.name}
                        />
                        <AvatarFallback>
                          {getInitials(conversation.otherUser?.name || '')}
                        </AvatarFallback>
                      </>
                    ) : (
                      <>
                        <AvatarImage
                          src={conversation.group?.image || undefined}
                          alt={conversation.group?.name}
                        />
                        <AvatarFallback>
                          {getInitials(conversation.group?.name || '')}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  {conversation.type === 'DIRECT' && conversation.otherUser?.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn('truncate', unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
                      {conversation.type === 'DIRECT'
                        ? conversation.otherUser?.name
                        : conversation.group?.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {conversation.lastMessage ? (
                        <p className={cn(
                          'text-sm truncate',
                          unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}>
                          {conversation.lastMessage.sender.name === 'You'
                            ? ''
                            : `${conversation.lastMessage.sender.name.split(' ')[0]}: `}
                          {truncate(conversation.lastMessage.content, 40)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No messages yet
                        </p>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          }))
        }
      </ScrollArea>
    </div>
  )
}
