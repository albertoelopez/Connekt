import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createConnectionSchema = z.object({
  receiverId: z.string().cuid(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACCEPTED'
    const type = searchParams.get('type') || 'all' // all, sent, received, pending

    let whereClause: any = {}

    if (type === 'sent') {
      whereClause = { senderId: session.user.id }
    } else if (type === 'received') {
      whereClause = { receiverId: session.user.id }
    } else if (type === 'pending') {
      whereClause = {
        receiverId: session.user.id,
        status: 'PENDING',
      }
    } else {
      whereClause = {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
        ],
      }
    }

    if (status && type !== 'pending') {
      whereClause.status = status
    }

    const connections = await db.connection.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to get the "other" user
    const transformedConnections = connections.map((connection) => {
      const otherUser =
        connection.senderId === session.user.id
          ? connection.receiver
          : connection.sender

      return {
        id: connection.id,
        status: connection.status,
        createdAt: connection.createdAt,
        user: otherUser,
        isSender: connection.senderId === session.user.id,
      }
    })

    return NextResponse.json(transformedConnections)
  } catch (error) {
    console.error('Get connections error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { receiverId } = createConnectionSchema.parse(body)

    // Check if user exists
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (receiverId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot connect with yourself' },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const existingConnection = await db.connection.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId },
          { senderId: receiverId, receiverId: session.user.id },
        ],
      },
    })

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Connection already exists' },
        { status: 400 }
      )
    }

    const connection = await db.connection.create({
      data: {
        senderId: session.user.id,
        receiverId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    // Create notification for receiver
    await db.notification.create({
      data: {
        userId: receiverId,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        body: `${session.user.name} wants to connect with you`,
        link: '/connections?tab=pending',
      },
    })

    return NextResponse.json(connection, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Create connection error:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}
