'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { HandHeart, CheckCircle, MoreHorizontal, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Prayer {
  id: string
  title: string
  content: string
  category: string
  isAnonymous: boolean
  isAnswered: boolean
  createdAt: string
  user: {
    id: string
    name: string
    image: string | null
  }
  prayerCount: number
  hasPrayed: boolean
}

interface PrayerCardProps {
  prayer: Prayer
  onUpdate: (id: string, updates: Partial<Prayer>) => void
  isOwner?: boolean
}

export function PrayerCard({ prayer, onUpdate, isOwner = false }: PrayerCardProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [isPraying, setIsPraying] = useState(false)

  const handlePray = async () => {
    setIsPraying(true)
    try {
      if (prayer.hasPrayed) {
        const response = await fetch(`/api/prayer-requests/${prayer.id}/pray`, {
          method: 'DELETE',
        })
        if (response.ok) {
          const data = await response.json()
          onUpdate(prayer.id, {
            hasPrayed: false,
            prayerCount: data.prayerCount,
          })
        }
      } else {
        const response = await fetch(`/api/prayer-requests/${prayer.id}/pray`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (response.ok) {
          const data = await response.json()
          onUpdate(prayer.id, {
            hasPrayed: true,
            prayerCount: data.prayerCount,
          })
          toast({
            title: 'Praying',
            description: 'Thank you for praying for this request.',
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record prayer',
        variant: 'destructive',
      })
    } finally {
      setIsPraying(false)
    }
  }

  const handleMarkAnswered = async () => {
    try {
      const response = await fetch(`/api/prayer-requests/${prayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAnswered: true }),
      })
      if (response.ok) {
        onUpdate(prayer.id, { isAnswered: true })
        toast({
          title: 'Praise God!',
          description: 'Prayer marked as answered. Those who prayed have been notified.',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update prayer',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/prayer-requests/${prayer.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onUpdate(prayer.id, { id: '' }) // Signal deletion
        toast({
          title: 'Deleted',
          description: 'Prayer request has been deleted.',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete prayer',
        variant: 'destructive',
      })
    }
  }

  const isOwnPrayer = session?.user?.id === prayer.user.id

  return (
    <Card className={prayer.isAnswered ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {prayer.user.id !== 'anonymous' ? (
            <Link href={`/profile/${prayer.user.id}`}>
              <Avatar>
                <AvatarImage src={prayer.user.image || undefined} alt={prayer.user.name} />
                <AvatarFallback>{getInitials(prayer.user.name)}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Avatar>
              <AvatarFallback>?</AvatarFallback>
            </Avatar>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {prayer.user.id !== 'anonymous' ? prayer.user.name : 'Anonymous'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {prayer.category}
                  </Badge>
                  {prayer.isAnswered && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Answered
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(prayer.createdAt)}
                </p>
              </div>

              {(isOwner || isOwnPrayer) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!prayer.isAnswered && (
                      <DropdownMenuItem onClick={handleMarkAnswered}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Answered
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <h3 className="font-semibold mt-2">{prayer.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
              {prayer.content}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <Button
                variant={prayer.hasPrayed ? 'default' : 'outline'}
                size="sm"
                onClick={handlePray}
                disabled={isPraying || isOwnPrayer}
              >
                {isPraying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <HandHeart className="mr-2 h-4 w-4" />
                )}
                {prayer.hasPrayed ? "I'm Praying" : 'Pray'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {prayer.prayerCount} {prayer.prayerCount === 1 ? 'person' : 'people'} praying
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
