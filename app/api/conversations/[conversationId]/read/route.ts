import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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

    // Find all unread messages in this conversation not sent by current user
    const unreadMessages = await db.message.findMany({
      where: {
        conversationId,
        senderId: { not: session.user.id },
        isDeleted: false,
        readBy: {
          none: {
            userId: session.user.id,
          },
        },
      },
      select: { id: true },
    })

    if (unreadMessages.length > 0) {
      // Create read receipts for all unread messages
      await db.$transaction(
        unreadMessages.map((msg) =>
          db.messageRead.upsert({
            where: {
              messageId_userId: {
                messageId: msg.id,
                userId: session.user.id,
              },
            },
            create: {
              messageId: msg.id,
              userId: session.user.id,
            },
            update: {},
          })
        )
      )
    }

    // Also update lastReadAt on the participant record
    await db.conversationParticipant.update({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
      data: { lastReadAt: new Date() },
    })

    return NextResponse.json({ success: true, markedRead: unreadMessages.length })
  } catch (error) {
    console.error('Mark messages read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}
