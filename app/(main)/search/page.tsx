'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Users, Calendar, Heart, UsersRound, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { getInitials, formatDate, truncate } from '@/lib/utils'

interface SearchResults {
  users?: Array<{
    id: string
    name: string
    image: string | null
    bio: string | null
    denomination: string | null
    city: string | null
    state: string | null
    isOnline: boolean
  }>
  groups?: Array<{
    id: string
    name: string
    description: string | null
    image: string | null
    type: string
    city: string | null
    state: string | null
    _count: { members: number }
  }>
  events?: Array<{
    id: string
    title: string
    description: string | null
    image: string | null
    startDate: string
    endDate: string | null
    isOnline: boolean
    city: string | null
    state: string | null
    _count: { attendees: number }
    organizer: { id: string; name: string }
  }>
  prayers?: Array<{
    id: string
    title: string
    content: string
    category: string
    isAnswered: boolean
    createdAt: string
    user: { id: string; name: string; image: string | null }
    _count: { responses: number }
  }>
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [activeTab, setActiveTab] = useState('all')
  const [results, setResults] = useState<SearchResults>({})
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const performSearch = async (searchQuery: string, type: string) => {
    if (!searchQuery || searchQuery.length < 2) return

    setLoading(true)
    setSearched(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${type}`
      )
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, activeTab)
    }
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query, activeTab)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (query.length >= 2) {
      performSearch(query, tab)
    }
  }

  const totalResults =
    (results.users?.length || 0) +
    (results.groups?.length || 0) +
    (results.events?.length || 0) +
    (results.prayers?.length || 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search across users, groups, events, and prayer requests
        </p>
      </div>

      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
      </form>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="prayers">Prayers</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Start searching</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter at least 2 characters to search
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No results found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <>
            <TabsContent value="all" className="space-y-6">
              {results.users && results.users.length > 0 && (
                <ResultSection title="Users" icon={<Users className="h-4 w-4" />} count={results.users.length}>
                  {results.users.map((user) => (
                    <UserResultCard key={user.id} user={user} />
                  ))}
                </ResultSection>
              )}
              {results.groups && results.groups.length > 0 && (
                <ResultSection title="Groups" icon={<UsersRound className="h-4 w-4" />} count={results.groups.length}>
                  {results.groups.map((group) => (
                    <GroupResultCard key={group.id} group={group} />
                  ))}
                </ResultSection>
              )}
              {results.events && results.events.length > 0 && (
                <ResultSection title="Events" icon={<Calendar className="h-4 w-4" />} count={results.events.length}>
                  {results.events.map((event) => (
                    <EventResultCard key={event.id} event={event} />
                  ))}
                </ResultSection>
              )}
              {results.prayers && results.prayers.length > 0 && (
                <ResultSection title="Prayer Requests" icon={<Heart className="h-4 w-4" />} count={results.prayers.length}>
                  {results.prayers.map((prayer) => (
                    <PrayerResultCard key={prayer.id} prayer={prayer} />
                  ))}
                </ResultSection>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-3">
              {results.users?.map((user) => (
                <UserResultCard key={user.id} user={user} />
              ))}
              {results.users?.length === 0 && <NoResults type="users" />}
            </TabsContent>

            <TabsContent value="groups" className="space-y-3">
              {results.groups?.map((group) => (
                <GroupResultCard key={group.id} group={group} />
              ))}
              {results.groups?.length === 0 && <NoResults type="groups" />}
            </TabsContent>

            <TabsContent value="events" className="space-y-3">
              {results.events?.map((event) => (
                <EventResultCard key={event.id} event={event} />
              ))}
              {results.events?.length === 0 && <NoResults type="events" />}
            </TabsContent>

            <TabsContent value="prayers" className="space-y-3">
              {results.prayers?.map((prayer) => (
                <PrayerResultCard key={prayer.id} prayer={prayer} />
              ))}
              {results.prayers?.length === 0 && <NoResults type="prayer requests" />}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}

function ResultSection({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function UserResultCard({ user }: { user: SearchResults['users'] extends (infer U)[] | undefined ? U : never }) {
  if (!user) return null
  return (
    <Link href={`/profile/${user.id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              {user.isOnline && (
                <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
              )}
            </div>
            {user.bio && (
              <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {user.denomination && (
                <Badge variant="outline" className="text-xs">{user.denomination}</Badge>
              )}
              {user.city && (
                <span className="text-xs text-muted-foreground">{user.city}{user.state ? `, ${user.state}` : ''}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function GroupResultCard({ group }: { group: SearchResults['groups'] extends (infer U)[] | undefined ? U : never }) {
  if (!group) return null
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
            <UsersRound className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{group.name}</p>
            {group.description && (
              <p className="text-xs text-muted-foreground truncate">{group.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{group.type.replace('_', ' ')}</Badge>
              <span className="text-xs text-muted-foreground">{group._count.members} members</span>
              {group.city && (
                <span className="text-xs text-muted-foreground">{group.city}{group.state ? `, ${group.state}` : ''}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EventResultCard({ event }: { event: SearchResults['events'] extends (infer U)[] | undefined ? U : never }) {
  if (!event) return null
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground truncate">{event.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{formatDate(event.startDate)}</span>
              {event.isOnline ? (
                <Badge variant="secondary" className="text-xs">Online</Badge>
              ) : event.city ? (
                <span className="text-xs text-muted-foreground">{event.city}{event.state ? `, ${event.state}` : ''}</span>
              ) : null}
              <span className="text-xs text-muted-foreground">{event._count.attendees} attending</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function PrayerResultCard({ prayer }: { prayer: SearchResults['prayers'] extends (infer U)[] | undefined ? U : never }) {
  if (!prayer) return null
  return (
    <Link href={`/prayers`}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{prayer.title}</p>
            <p className="text-xs text-muted-foreground truncate">{truncate(prayer.content, 100)}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{prayer.category}</Badge>
              {prayer.isAnswered && (
                <Badge variant="secondary" className="text-xs">Answered</Badge>
              )}
              <span className="text-xs text-muted-foreground">by {prayer.user.name}</span>
              <span className="text-xs text-muted-foreground">{prayer._count.responses} prayers</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function NoResults({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground">No {type} found</p>
    </div>
  )
}
