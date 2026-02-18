import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all conversations the user participates in
    const participants = await db.conversationParticipant.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    })

    // For each conversation, count messages sent by others after lastReadAt
    const perConversation: Record<string, number> = {}
    let totalUnread = 0

    for (const participant of participants) {
      const count = await db.message.count({
        where: {
          conversationId: participant.conversationId,
          senderId: { not: userId },
          isDeleted: false,
          createdAt: { gt: participant.lastReadAt },
        },
      })

      if (count > 0) {
        perConversation[participant.conversationId] = count
        totalUnread += count
      }
    }

    // Also get unread notification count
    const unreadNotifications = await db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })

    return NextResponse.json({
      totalUnread,
      perConversation,
      unreadNotifications,
    })
  } catch (error) {
    console.error('Get unread counts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    )
  }
}
