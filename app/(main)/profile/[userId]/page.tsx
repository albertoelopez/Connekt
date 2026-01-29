'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { getInitials, formatDate, formatRelativeTime } from '@/lib/utils'
import { Calendar, MapPin, Users, UserPlus, Check, Clock, MessageCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  image: string | null
  bio: string | null
  denomination: string | null
  spiritualInterests: string[]
  city: string | null
  state: string | null
  isOnline: boolean
  lastSeen: string
  createdAt: string
  connectionCount: number
  groupCount: number
  connectionStatus: string | null
  isConnectionSender: boolean
  connectionId: string | null
}

export default function UserProfilePage({
  params,
}: {
  params: { userId: string }
}) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectionLoading, setConnectionLoading] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${params.userId}`)
        if (response.status === 404) {
          return notFound()
        }
        const data = await response.json()
        if (response.ok) {
          setProfile(data)
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [params.userId])

  const handleConnect = async () => {
    if (!profile) return
    setConnectionLoading(true)

    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: profile.id }),
      })

      if (response.ok) {
        setProfile((prev) =>
          prev ? { ...prev, connectionStatus: 'PENDING', isConnectionSender: true } : null
        )
        toast({
          title: 'Connection Request Sent',
          description: `Your request has been sent to ${profile.name}`,
        })
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
      setConnectionLoading(false)
    }
  }

  const handleAcceptConnection = async () => {
    if (!profile?.connectionId) return
    setConnectionLoading(true)

    try {
      const response = await fetch(`/api/connections/${profile.connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      if (response.ok) {
        setProfile((prev) =>
          prev ? { ...prev, connectionStatus: 'ACCEPTED' } : null
        )
        toast({
          title: 'Connection Accepted',
          description: `You are now connected with ${profile.name}`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept connection',
        variant: 'destructive',
      })
    } finally {
      setConnectionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!profile) {
    return <div>User not found</div>
  }

  const isOwnProfile = session?.user?.id === profile.id

  const getConnectionButton = () => {
    if (isOwnProfile) return null

    if (profile.connectionStatus === 'ACCEPTED') {
      return (
        <div className="flex gap-2">
          <Button variant="secondary" disabled>
            <Check className="mr-2 h-4 w-4" />
            Connected
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/messages?userId=${profile.id}`}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Link>
          </Button>
        </div>
      )
    }

    if (profile.connectionStatus === 'PENDING') {
      if (profile.isConnectionSender) {
        return (
          <Button variant="outline" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Request Pending
          </Button>
        )
      } else {
        return (
          <Button onClick={handleAcceptConnection} disabled={connectionLoading}>
            {connectionLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Accept Request
          </Button>
        )
      }
    }

    return (
      <Button onClick={handleConnect} disabled={connectionLoading}>
        {connectionLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Connect
      </Button>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.image || undefined} alt={profile.name} />
                <AvatarFallback className="text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              {profile.isOnline && (
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  {profile.denomination && (
                    <p className="text-muted-foreground">{profile.denomination}</p>
                  )}
                  {(profile.city || profile.state) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4" />
                      {[profile.city, profile.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
                {getConnectionButton()}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.connectionCount}</span>
                  <span className="text-muted-foreground">connections</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.groupCount}</span>
                  <span className="text-muted-foreground">groups</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>

              {!profile.isOnline && (
                <p className="text-sm text-muted-foreground">
                  Last seen {formatRelativeTime(profile.lastSeen)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.spiritualInterests.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4">Spiritual Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.spiritualInterests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
