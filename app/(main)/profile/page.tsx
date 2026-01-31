'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileEditForm } from '@/components/user/profile-edit-form'
import { getInitials, formatDate } from '@/lib/utils'
import { Calendar, MapPin, Users, HandHeart, Edit } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  denomination: string | null
  spiritualInterests: string[]
  city: string | null
  state: string | null
  locationSharing: boolean
  createdAt: string
  connectionCount: number
  groupCount: number
  prayerCount: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/me')
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

  useEffect(() => {
    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!profile) {
    return <div>Failed to load profile</div>
  }

  if (isEditing) {
    return (
      <ProfileEditForm
        profile={profile}
        onCancel={() => setIsEditing(false)}
        onSave={() => {
          setIsEditing(false)
          fetchProfile()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.image || undefined} alt={profile.name} />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>

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
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
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
                  <HandHeart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{profile.prayerCount}</span>
                  <span className="text-muted-foreground">prayers</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {formatDate(profile.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="interests">
        <TabsList>
          <TabsTrigger value="interests">Spiritual Interests</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="interests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Spiritual Interests</CardTitle>
            </CardHeader>
            <CardContent>
              {profile.spiritualInterests && profile.spiritualInterests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.spiritualInterests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No spiritual interests added yet.{' '}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-primary hover:underline"
                  >
                    Add some now
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Activity feed coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
