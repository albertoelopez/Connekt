import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const group = await db.group.findUnique({
      where: { id: groupId },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Already a member of this group' },
        { status: 400 }
      )
    }

    // Add as member
    const membership = await db.groupMember.create({
      data: {
        userId: session.user.id,
        groupId,
        role: 'MEMBER',
      },
    })

    // Add to group conversation
    const conversation = await db.conversation.findFirst({
      where: { groupId },
    })

    if (conversation) {
      await db.conversationParticipant.create({
        data: {
          userId: session.user.id,
          conversationId: conversation.id,
        },
      })
    }

    return NextResponse.json(membership, { status: 201 })
  } catch (error) {
    console.error('Join group error:', error)
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = params

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
        { error: 'Not a member of this group' },
        { status: 400 }
      )
    }

    if (membership.role === 'OWNER') {
      return NextResponse.json(
        { error: 'Owner cannot leave the group. Transfer ownership or delete the group.' },
        { status: 400 }
      )
    }

    // Remove from group
    await db.groupMember.delete({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    })

    // Remove from conversation
    const conversation = await db.conversation.findFirst({
      where: { groupId },
    })

    if (conversation) {
      await db.conversationParticipant.deleteMany({
        where: {
          userId: session.user.id,
          conversationId: conversation.id,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    )
  }
}
