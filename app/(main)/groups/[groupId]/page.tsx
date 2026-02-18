'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'
import { ChatView } from '@/components/messaging/chat-view'
import {
  Users,
  MapPin,
  Calendar,
  MessageCircle,
  ArrowLeft,
  LogOut,
  LogIn,
  Trash2,
  Church,
  Book,
  HandHeart,
  UserRound,
  Crown,
  Shield,
  Loader2,
  Lock,
} from 'lucide-react'

const groupTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CHURCH: Church,
  BIBLE_STUDY: Book,
  PRAYER_CIRCLE: HandHeart,
  FELLOWSHIP: UserRound,
  OTHER: Users,
}

const roleIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  OWNER: Crown,
  ADMIN: Shield,
}

interface GroupDetail {
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
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      image: string | null
      isOnline: boolean
    }
  }>
  memberCount: number
  eventCount: number
  prayerCount: number
  isMember: boolean
  userRole: string | null
  conversationId: string | null
}

export default function GroupDetailPage({
  params,
}: {
  params: { groupId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [chatConversationId, setChatConversationId] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    fetchGroup()
  }, [params.groupId])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${params.groupId}`)
      if (response.ok) {
        setGroup(await response.json())
      } else if (response.status === 404) {
        router.push('/groups')
      }
    } catch (error) {
      console.error('Failed to fetch group:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = async () => {
    if (chatConversationId || chatLoading) return
    setChatLoading(true)
    try {
      const response = await fetch(`/api/groups/${params.groupId}/chat`, {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        setChatConversationId(data.conversationId)
      }
    } catch (error) {
      console.error('Failed to load group chat:', error)
    } finally {
      setChatLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!group) return
    setActionLoading(true)

    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchGroup()
        toast({
          title: 'Joined Group',
          description: `You are now a member of ${group.name}`,
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to join group',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join group',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!group || !confirm('Are you sure you want to leave this group?')) return
    setActionLoading(true)

    try {
      const response = await fetch(`/api/groups/${group.id}/members`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchGroup()
        toast({
          title: 'Left Group',
          description: `You have left ${group.name}`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave group',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!group || !confirm('Are you sure you want to delete this group? This action cannot be undone.')) return
    setActionLoading(true)

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Group Deleted',
          description: 'The group has been deleted',
        })
        router.push('/groups')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
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

  if (!group) {
    return <div>Group not found</div>
  }

  // Private group view for non-members
  if (group.isPrivate && !group.isMember) {
    const Icon = groupTypeIcons[group.type] || Users

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{group.name}</h1>
              <Badge variant="outline" className="mb-4">
                <Icon className="mr-1 h-3 w-3" />
                {group.type.replace('_', ' ')}
              </Badge>
              <p className="text-muted-foreground mb-6">
                This is a private group with {group.memberCount} members.
              </p>
              <Button onClick={handleJoin} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Request to Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const Icon = groupTypeIcons[group.type] || Users
  const isOwner = group.userRole === 'OWNER'
  const isAdmin = ['OWNER', 'ADMIN'].includes(group.userRole || '')

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20">
              <AvatarImage src={group.image || undefined} alt={group.name} />
              <AvatarFallback>
                <Icon className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    {group.isPrivate && (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      <Icon className="mr-1 h-3 w-3" />
                      {group.type.replace('_', ' ')}
                    </Badge>
                    {(group.city || group.state) && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[group.city, group.state].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {!group.isMember && (
                    <Button onClick={handleJoin} disabled={actionLoading}>
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      Join Group
                    </Button>
                  )}
                  {group.isMember && !isOwner && (
                    <Button
                      variant="outline"
                      onClick={handleLeave}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      Leave
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {group.description && (
                <p className="text-muted-foreground">{group.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{group.memberCount}</span>
                  <span className="text-muted-foreground">members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{group.eventCount}</span>
                  <span className="text-muted-foreground">events</span>
                </div>
                <div className="flex items-center gap-1">
                  <HandHeart className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{group.prayerCount}</span>
                  <span className="text-muted-foreground">prayers</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="members" onValueChange={(value) => {
        if (value === 'chat' && group.isMember) {
          handleOpenChat()
        }
      }}>
        <TabsList>
          {group.isMember && (
            <TabsTrigger value="chat">
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Chat
            </TabsTrigger>
          )}
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        {group.isMember && (
          <TabsContent value="chat" className="mt-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0 h-[500px]">
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chatConversationId ? (
                  <ChatView conversationId={chatConversationId} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Loading chat...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Members ({group.members?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!group.members || group.members.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No members yet
                </p>
              ) : (
                <div className="space-y-3">
                  {group.members.map(({ id, role, user }) => {
                    const RoleIcon = roleIcons[role]
                    return (
                      <Link
                        key={id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={user.image || undefined}
                              alt={user.name}
                            />
                            <AvatarFallback>
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.name}</p>
                          {role !== 'MEMBER' && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {RoleIcon && <RoleIcon className="h-3 w-3" />}
                              {role}
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Created By</h3>
                <Link
                  href={`/profile/${group.owner.id}`}
                  className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={group.owner.image || undefined}
                      alt={group.owner.name}
                    />
                    <AvatarFallback>
                      {getInitials(group.owner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{group.owner.name}</span>
                </Link>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Group Type</h3>
                <Badge variant="secondary" className="text-sm">
                  <Icon className="mr-1 h-4 w-4" />
                  {group.type.replace('_', ' ')}
                </Badge>
              </div>

              {(group.city || group.state) && (
                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[group.city, group.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Privacy</h3>
                <p className="text-muted-foreground">
                  {group.isPrivate
                    ? 'This is a private group. Members must be approved to join.'
                    : 'This is a public group. Anyone can join.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
