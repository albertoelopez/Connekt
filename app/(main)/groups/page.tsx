'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocation } from '@/hooks/useLocation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateGroupDialog } from '@/components/groups/create-group-dialog'
import { getInitials } from '@/lib/utils'
import { Search, Users, MapPin, Plus, Church, Book, HandHeart, UserRound } from 'lucide-react'

const groupTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CHURCH: Church,
  BIBLE_STUDY: Book,
  PRAYER_CIRCLE: HandHeart,
  FELLOWSHIP: UserRound,
  OTHER: Users,
}

interface Group {
  id: string
  name: string
  description: string | null
  image: string | null
  type: string
  isPrivate: boolean
  city: string | null
  state: string | null
  owner: {
    id: string
    name: string
    image: string | null
  }
  memberCount: number
  isMember: boolean
  userRole: string | null
  distance: number | null
}

export default function GroupsPage() {
  const { coordinates } = useLocation()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [coordinates])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (coordinates) {
        params.append('latitude', coordinates.latitude.toString())
        params.append('longitude', coordinates.longitude.toString())
      }

      const [allRes, myRes] = await Promise.all([
        fetch(`/api/groups?type=nearby&${params}`),
        fetch('/api/groups?type=my'),
      ])

      if (allRes.ok) setGroups(await allRes.json())
      if (myRes.ok) setMyGroups(await myRes.json())
    } catch (error) {
      console.error('Failed to fetch groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const GroupCard = ({ group }: { group: Group }) => {
    const Icon = groupTypeIcons[group.type] || Users

    return (
      <Link href={`/groups/${group.id}`}>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.image || undefined} alt={group.name} />
                <AvatarFallback>
                  <Icon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{group.name}</h3>
                  {group.isPrivate && (
                    <Badge variant="outline" className="text-xs">
                      Private
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {group.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.memberCount} members
                  </span>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  {(group.city || group.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[group.city, group.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {group.distance !== null && (
                    <span>{group.distance.toFixed(1)} miles away</span>
                  )}
                </div>
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
          <h1 className="text-2xl font-bold">Groups</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="my">My Groups ({myGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="mt-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No groups found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or create a new group
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-6">
          {myGroups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No groups yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Join a group or create your own
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myGroups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          fetchGroups()
        }}
      />
    </div>
  )
}
