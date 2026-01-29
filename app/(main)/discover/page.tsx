'use client'

import { useState, useEffect } from 'react'
import { useLocation } from '@/hooks/useLocation'
import { UserCard } from '@/components/user/user-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, RefreshCw, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NearbyUser {
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

export default function DiscoverPage() {
  const { coordinates, error: locationError, loading: locationLoading, requestLocation } = useLocation()
  const { toast } = useToast()

  const [users, setUsers] = useState<NearbyUser[]>([])
  const [loading, setLoading] = useState(false)
  const [radius, setRadius] = useState('50')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchNearbyUsers = async () => {
    if (!coordinates) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/users/nearby?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&radius=${radius}`
      )
      const data = await response.json()

      if (response.ok) {
        setUsers(data.data)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch nearby users',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch nearby users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (coordinates) {
      fetchNearbyUsers()
    }
  }, [coordinates, radius])

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.denomination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.spiritualInterests.some((i) =>
      i.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  if (locationLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Discover</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Getting your location...</p>
          </div>
        </div>
      </div>
    )
  }

  if (locationError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Discover</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <MapPin className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-muted-foreground">{locationError}</p>
            <Button onClick={requestLocation}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Discover Believers Near You</h1>
        <Button onClick={fetchNearbyUsers} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, interests, denomination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={radius} onValueChange={setRadius}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Distance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Within 10 miles</SelectItem>
            <SelectItem value="25">Within 25 miles</SelectItem>
            <SelectItem value="50">Within 50 miles</SelectItem>
            <SelectItem value="100">Within 100 miles</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No believers found nearby</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try increasing the search radius or check back later
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} onConnectionChange={fetchNearbyUsers} />
          ))}
        </div>
      )}
    </div>
  )
}
