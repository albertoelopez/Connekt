'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocation } from '@/hooks/useLocation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateEventDialog } from '@/components/events/create-event-dialog'
import { formatDate } from '@/lib/utils'
import { Plus, Calendar, MapPin, Users, Video, Clock } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  isOnline: boolean
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
  } | null
  attendeeCount: number
  userRsvp: string | null
  distance: number | null
}

export default function EventsPage() {
  const { coordinates } = useLocation()
  const [events, setEvents] = useState<Event[]>([])
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [coordinates])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (coordinates) {
        params.append('latitude', coordinates.latitude.toString())
        params.append('longitude', coordinates.longitude.toString())
      }

      const [nearbyRes, myRes, attendingRes] = await Promise.all([
        fetch(`/api/events?type=nearby&${params}`),
        fetch('/api/events?type=my'),
        fetch('/api/events?type=attending'),
      ])

      if (nearbyRes.ok) setEvents(await nearbyRes.json())
      if (myRes.ok) setMyEvents(await myRes.json())
      if (attendingRes.ok) setAttendingEvents(await attendingRes.json())
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const EventCard = ({ event }: { event: Event }) => {
    const startDate = new Date(event.startDate)
    const endDate = event.endDate ? new Date(event.endDate) : null

    return (
      <Link href={`/events/${event.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 text-center">
                <div className="text-xs font-medium text-primary uppercase">
                  {startDate.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                <div className="text-2xl font-bold">
                  {startDate.getDate()}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{event.title}</h3>
                  {event.isOnline && (
                    <Badge variant="secondary" className="text-xs">
                      <Video className="mr-1 h-3 w-3" />
                      Online
                    </Badge>
                  )}
                  {event.userRsvp && (
                    <Badge
                      variant={event.userRsvp === 'GOING' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {event.userRsvp}
                    </Badge>
                  )}
                </div>

                {event.group && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hosted by {event.group.name}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {startDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {endDate && ` - ${endDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}`}
                  </span>

                  {!event.isOnline && (event.city || event.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[event.city, event.state].filter(Boolean).join(', ')}
                    </span>
                  )}

                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.attendeeCount}
                    {event.maxAttendees && ` / ${event.maxAttendees}`}
                  </span>
                </div>

                {event.distance !== null && !event.isOnline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.distance.toFixed(1)} miles away
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Events</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="attending">
            Attending ({attendingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="hosting">
            Hosting ({myEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-6">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No upcoming events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create an event or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attending" className="mt-6">
          {attendingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No events yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                RSVP to events to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hosting" className="mt-6">
          {myEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No events created</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create an event to bring people together
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          fetchEvents()
        }}
      />
    </div>
  )
}
