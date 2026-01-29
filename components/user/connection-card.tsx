'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { MessageCircle, Check, X, Loader2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ConnectionCardProps {
  connection: {
    id: string
    status: string
    user: {
      id: string
      name: string
      image: string | null
      bio: string | null
      isOnline: boolean
      lastSeen: string
    }
    isSender: boolean
  }
  onUpdate: () => void
  showActions?: boolean
}

export function ConnectionCard({
  connection,
  onUpdate,
  showActions = false,
}: ConnectionCardProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (status: 'ACCEPTED' | 'REJECTED') => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/connections/${connection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        toast({
          title: status === 'ACCEPTED' ? 'Connection Accepted' : 'Request Declined',
          description:
            status === 'ACCEPTED'
              ? `You are now connected with ${connection.user.name}`
              : 'The connection request has been declined',
        })
        onUpdate()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update connection',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/connections/${connection.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Connection Removed',
          description: `${connection.user.name} has been removed from your connections`,
        })
        onUpdate()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove connection',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Link href={`/profile/${connection.user.id}`}>
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={connection.user.image || undefined}
                  alt={connection.user.name}
                />
                <AvatarFallback>
                  {getInitials(connection.user.name)}
                </AvatarFallback>
              </Avatar>
              {connection.user.isOnline && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/profile/${connection.user.id}`}>
              <h3 className="font-semibold truncate hover:underline">
                {connection.user.name}
              </h3>
            </Link>
            {connection.user.bio && (
              <p className="text-sm text-muted-foreground truncate">
                {connection.user.bio}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {connection.user.isOnline
                ? 'Online'
                : `Last seen ${formatRelativeTime(connection.user.lastSeen)}`}
            </p>
          </div>

          {showActions ? (
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleAction('ACCEPTED')}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleAction('REJECTED')}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" asChild>
                <Link href={`/messages?userId=${connection.user.id}`}>
                  <MessageCircle className="h-4 w-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${connection.user.id}`}>
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-destructive"
                  >
                    Remove Connection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
