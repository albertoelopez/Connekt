import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET or create the group conversation, returning its ID
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = params

    // Verify user is a member of the group
    const membership = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Must be a group member to access chat' },
        { status: 403 }
      )
    }

    // Check if conversation already exists
    let conversation = await db.conversation.findUnique({
      where: { groupId },
    })

    if (!conversation) {
      // Create conversation and add all current group members as participants
      const members = await db.groupMember.findMany({
        where: { groupId },
        select: { userId: true },
      })

      conversation = await db.conversation.create({
        data: {
          type: 'GROUP',
          groupId,
          participants: {
            create: members.map((m) => ({
              userId: m.userId,
            })),
          },
        },
      })
    } else {
      // Ensure the current user is a participant (handles edge cases)
      const existing = await db.conversationParticipant.findUnique({
        where: {
          userId_conversationId: {
            userId: session.user.id,
            conversationId: conversation.id,
          },
        },
      })

      if (!existing) {
        await db.conversationParticipant.create({
          data: {
            userId: session.user.id,
            conversationId: conversation.id,
          },
        })
      }
    }

    return NextResponse.json({ conversationId: conversation.id })
  } catch (error) {
    console.error('Group chat error:', error)
    return NextResponse.json(
      { error: 'Failed to access group chat' },
      { status: 500 }
    )
  }
}
