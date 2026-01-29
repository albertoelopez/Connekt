'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectionCard } from '@/components/user/connection-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserPlus, Clock } from 'lucide-react'

interface Connection {
  id: string
  status: string
  createdAt: string
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

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingConnections, setPendingConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConnections = async () => {
    try {
      const [connectionsRes, pendingRes] = await Promise.all([
        fetch('/api/connections?status=ACCEPTED'),
        fetch('/api/connections?type=pending'),
      ])

      const connectionsData = await connectionsRes.json()
      const pendingData = await pendingRes.json()

      if (connectionsRes.ok) setConnections(connectionsData)
      if (pendingRes.ok) setPendingConnections(pendingData)
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleConnectionUpdate = () => {
    fetchConnections()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Connections</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connections</h1>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections" className="gap-2">
            <Users className="h-4 w-4" />
            Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingConnections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-6">
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No connections yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start connecting with believers in the Discover tab
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onUpdate={handleConnectionUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingConnections.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No pending requests</h3>
              <p className="text-sm text-muted-foreground mt-1">
                When someone sends you a connection request, it will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pendingConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onUpdate={handleConnectionUpdate}
                  showActions
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
