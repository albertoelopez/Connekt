import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sseManager } from '@/lib/sse'
import { z } from 'zod'

const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  replyToId: z.string().cuid().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Verify user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant of this conversation' },
        { status: 403 }
      )
    }

    const messages = await db.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    })

    // Update last read
    await db.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
      data: { lastReadAt: new Date() },
    })

    return NextResponse.json({
      data: messages,
      nextCursor:
        messages.length === limit ? messages[messages.length - 1].id : null,
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = params
    const body = await request.json()
    const { content, replyToId } = createMessageSchema.parse(body)

    // Verify user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant of this conversation' },
        { status: 403 }
      )
    }

    // Create message
    const message = await db.message.create({
      data: {
        content,
        conversationId,
        senderId: session.user.id,
        replyToId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Send via SSE to all participants
    sseManager.sendToConversation(conversationId, 'new-message', message)

    // Create notifications for other participants
    const otherParticipants = await db.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: session.user.id },
      },
      include: {
        user: {
          select: { notificationsEnabled: true },
        },
      },
    })

    for (const participant of otherParticipants) {
      if (participant.user.notificationsEnabled) {
        await db.notification.create({
          data: {
            userId: participant.userId,
            type: 'NEW_MESSAGE',
            title: 'New Message',
            body: `${session.user.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            link: `/messages?conversationId=${conversationId}`,
          },
        })

        // Send notification via SSE
        sseManager.sendToUser(participant.userId, 'notification', {
          type: 'NEW_MESSAGE',
          title: 'New Message',
          body: `${session.user.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        })
      }
    }

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Create message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
