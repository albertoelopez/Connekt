import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = params

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        denomination: true,
        spiritualInterests: true,
        city: true,
        state: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        _count: {
          select: {
            sentConnections: {
              where: { status: 'ACCEPTED' },
            },
            receivedConnections: {
              where: { status: 'ACCEPTED' },
            },
            groupMemberships: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check connection status
    const connection = await db.connection.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { receiverId: session.user.id, senderId: userId },
        ],
      },
      select: {
        id: true,
        status: true,
        senderId: true,
      },
    })

    const connectionCount =
      user._count.sentConnections + user._count.receivedConnections

    // Parse spiritualInterests from JSON string (SQLite stores it as string)
    let spiritualInterests: string[] = []
    if (user.spiritualInterests) {
      try {
        spiritualInterests = JSON.parse(user.spiritualInterests)
      } catch {
        spiritualInterests = []
      }
    }

    return NextResponse.json({
      ...user,
      spiritualInterests,
      connectionCount,
      groupCount: user._count.groupMemberships,
      connectionStatus: connection?.status || null,
      isConnectionSender: connection?.senderId === session.user.id || false,
      connectionId: connection?.id || null,
      _count: undefined,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
