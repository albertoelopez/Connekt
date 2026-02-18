'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { MapPin, UserPlus, UserMinus, Check, Clock, Loader2 } from 'lucide-react'

interface UserCardProps {
  user: {
    id: string
    name: string
    image: string | null
    bio: string | null
    denomination: string | null
    spiritualInterests: string[]
    city: string | null
    state: string | null
    isOnline: boolean
    lastSeen: Date
    distance: number
    connectionStatus: string | null
    isConnectionSender: boolean
  }
  onConnectionChange?: () => void
}

export function UserCard({ user, onConnectionChange }: UserCardProps) {
  const { toast } = useToast()
  const [connectionStatus, setConnectionStatus] = useState(user.connectionStatus)
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: user.id }),
      })

      if (response.ok) {
        setConnectionStatus('PENDING')
        toast({
          title: 'Connection Request Sent',
          description: `Your request has been sent to ${user.name}`,
        })
        onConnectionChange?.()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to send connection request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send connection request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getConnectionButton = () => {
    if (connectionStatus === 'ACCEPTED') {
      return (
        <Button variant="secondary" size="sm" disabled>
          <Check className="mr-1 h-4 w-4" />
          Connected
        </Button>
      )
    }

    if (connectionStatus === 'PENDING') {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="mr-1 h-4 w-4" />
          {user.isConnectionSender ? 'Pending' : 'Respond'}
        </Button>
      )
    }

    return (
      <Button size="sm" onClick={handleConnect} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-1 h-4 w-4" />
        )}
        Connect
      </Button>
    )
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <Link href={`/profile/${user.id}`} className="block">
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.image || undefined} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{user.name}</h3>
              {user.denomination && (
                <p className="text-sm text-muted-foreground truncate">
                  {user.denomination}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span>{user.distance.toFixed(1)} miles away</span>
                {(user.city || user.state) && (
                  <span>
                    {' '}
                    - {[user.city, user.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {user.bio}
            </p>
          )}

          {user.spiritualInterests && Array.isArray(user.spiritualInterests) && user.spiritualInterests.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {user.spiritualInterests.slice(0, 3).map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {user.spiritualInterests.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{user.spiritualInterests.length - 3}
                </Badge>
              )}
            </div>
          )}
        </Link>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {user.isOnline ? 'Online' : `Last seen ${formatRelativeTime(user.lastSeen)}`}
        </span>
        {getConnectionButton()}
      </CardFooter>
    </Card>
  )
}
