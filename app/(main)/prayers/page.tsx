'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PrayerCard } from '@/components/prayers/prayer-card'
import { CreatePrayerDialog } from '@/components/prayers/create-prayer-dialog'
import { Plus, HandHeart, CheckCircle } from 'lucide-react'

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'WORK', label: 'Work' },
  { value: 'SPIRITUAL', label: 'Spiritual' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'OTHER', label: 'Other' },
]

interface Prayer {
  id: string
  title: string
  content: string
  category: string
  isAnonymous: boolean
  isPrivate: boolean
  isAnswered: boolean
  answeredAt: string | null
  createdAt: string
  user: {
    id: string
    name: string
    image: string | null
  }
  prayerCount: number
  hasPrayed: boolean
}

export default function PrayersPage() {
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [myPrayers, setMyPrayers] = useState<Prayer[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchPrayers()
  }, [category])

  const fetchPrayers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.append('category', category)

      const [feedRes, myRes] = await Promise.all([
        fetch(`/api/prayer-requests?type=feed&${params}`),
        fetch('/api/prayer-requests?type=my'),
      ])

      if (feedRes.ok) {
        const data = await feedRes.json()
        setPrayers(data.data)
      }
      if (myRes.ok) {
        const data = await myRes.json()
        setMyPrayers(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch prayers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrayerUpdate = (prayerId: string, updates: Partial<Prayer>) => {
    setPrayers((prev) =>
      prev.map((p) => (p.id === prayerId ? { ...p, ...updates } : p))
    )
    setMyPrayers((prev) =>
      prev.map((p) => (p.id === prayerId ? { ...p, ...updates } : p))
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Prayer Requests</h1>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Prayer Requests</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request Prayer
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed" className="gap-2">
            <HandHeart className="h-4 w-4" />
            Prayer Feed
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            My Requests ({myPrayers.length})
          </TabsTrigger>
          <TabsTrigger value="answered" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Answered
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          {prayers.length === 0 ? (
            <div className="text-center py-12">
              <HandHeart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No prayer requests</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect with others to see their prayer requests
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  onUpdate={handlePrayerUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-6">
          {myPrayers.length === 0 ? (
            <div className="text-center py-12">
              <HandHeart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No prayer requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Share your prayer needs with the community
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myPrayers.map((prayer) => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  onUpdate={handlePrayerUpdate}
                  isOwner
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="answered" className="mt-6">
          {prayers.filter((p) => p.isAnswered).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No answered prayers yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Answered prayers will appear here as testimonies
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prayers
                .filter((p) => p.isAnswered)
                .map((prayer) => (
                  <PrayerCard
                    key={prayer.id}
                    prayer={prayer}
                    onUpdate={handlePrayerUpdate}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreatePrayerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          fetchPrayers()
        }}
      />
    </div>
  )
}
