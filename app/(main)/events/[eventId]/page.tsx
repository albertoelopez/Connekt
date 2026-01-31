'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  ArrowLeft,
  Check,
  HelpCircle,
  X,
  Trash2,
  Loader2,
} from 'lucide-react'

interface EventDetail {
  id: string
  title: string
  description: string | null
  image: string | null
  startDate: string
  endDate: string | null
  isOnline: boolean
  meetingUrl: string | null
  address: string | null
  city: string | null
  state: string | null
  maxAttendees: number | null
  organizer: {
    id: string
    name: string
    image: string | null
  }
  group: {
    id: string
    name: string
    image: string | null
  } | null
  attendees: Array<{
    id: string
    status: string
    user: {
      id: string
      name: string
      image: string | null
      isOnline: boolean
    }
  }>
  attendeeCount: number
  userRsvp: string | null
  isOrganizer: boolean
}

export default function EventDetailPage({
  params,
}: {
  params: { eventId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchEvent()
  }, [params.eventId])

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.eventId}`)
      if (response.ok) {
        setEvent(await response.json())
      } else if (response.status === 404) {
        router.push('/events')
      }
    } catch (error) {
      console.error('Failed to fetch event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRsvp = async (status: 'GOING' | 'MAYBE' | 'NOT_GOING') => {
    if (!event) return
    setRsvpLoading(true)

    try {
      const response = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        await fetchEvent()
        toast({
          title: 'RSVP Updated',
          description: `You are ${status.toLowerCase().replace('_', ' ')} to this event`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update RSVP',
        variant: 'destructive',
      })
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this event?')) return
    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Event Deleted',
          description: 'The event has been deleted',
        })
        router.push('/events')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!event) {
    return <div>Event not found</div>
  }

  const startDate = new Date(event.startDate)
  const endDate = event.endDate ? new Date(event.endDate) : null
  const goingAttendees = event.attendees.filter((a) => a.status === 'GOING')
  const maybeAttendees = event.attendees.filter((a) => a.status === 'MAYBE')
  const isFull = !!(event.maxAttendees && goingAttendees.length >= event.maxAttendees)

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{event.title}</h1>
                  {event.isOnline && (
                    <Badge variant="secondary">
                      <Video className="mr-1 h-3 w-3" />
                      Online
                    </Badge>
                  )}
                </div>

                {event.group && (
                  <Link
                    href={`/groups/${event.group.id}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Hosted by {event.group.name}
                  </Link>
                )}
              </div>

              {event.isOrganizer && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Event
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                  <span className="text-xs font-medium text-primary uppercase">
                    {startDate.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-bold">
                    {startDate.getDate()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {startDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {startDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {endDate &&
                      ` - ${endDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {event.isOnline ? (
                  <>
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Online Event</p>
                      {event.meetingUrl && (
                        <a
                          href={event.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Join Meeting <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      {event.address && (
                        <p className="font-medium">{event.address}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {[event.city, event.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {event.description && (
              <div>
                <h3 className="font-semibold mb-2">About This Event</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={event.organizer.image || undefined}
                  alt={event.organizer.name}
                />
                <AvatarFallback>
                  {getInitials(event.organizer.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Organized by</p>
                <Link
                  href={`/profile/${event.organizer.id}`}
                  className="font-medium hover:underline"
                >
                  {event.organizer.name}
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!event.isOrganizer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your RSVP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={event.userRsvp === 'GOING' ? 'default' : 'outline'}
                onClick={() => handleRsvp('GOING')}
                disabled={rsvpLoading || (isFull && event.userRsvp !== 'GOING')}
              >
                <Check className="mr-2 h-4 w-4" />
                Going{isFull && ' (Full)'}
              </Button>
              <Button
                variant={event.userRsvp === 'MAYBE' ? 'default' : 'outline'}
                onClick={() => handleRsvp('MAYBE')}
                disabled={rsvpLoading}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Maybe
              </Button>
              <Button
                variant={event.userRsvp === 'NOT_GOING' ? 'default' : 'outline'}
                onClick={() => handleRsvp('NOT_GOING')}
                disabled={rsvpLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Can't Go
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees ({goingAttendees.length}
            {event.maxAttendees && ` / ${event.maxAttendees}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goingAttendees.length === 0 && maybeAttendees.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No attendees yet. Be the first to RSVP!
            </p>
          ) : (
            <div className="space-y-4">
              {goingAttendees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Going ({goingAttendees.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {goingAttendees.map(({ user }) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={user.image || undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {maybeAttendees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Maybe ({maybeAttendees.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {maybeAttendees.map(({ user }) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted/80 transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={user.image || undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
