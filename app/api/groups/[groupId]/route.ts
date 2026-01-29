import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['CHURCH', 'BIBLE_STUDY', 'PRAYER_CIRCLE', 'FELLOWSHIP', 'OTHER']).optional(),
  isPrivate: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export async function GET(
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
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                isOnline: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' },
            { joinedAt: 'asc' },
          ],
        },
        conversation: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            members: true,
            events: true,
            prayerRequests: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user is member
    const userMembership = group.members.find((m) => m.user.id === session.user.id)

    // If group is private and user is not a member, restrict access
    if (group.isPrivate && !userMembership) {
      return NextResponse.json({
        id: group.id,
        name: group.name,
        type: group.type,
        isPrivate: true,
        memberCount: group._count.members,
        isMember: false,
        userRole: null,
      })
    }

    return NextResponse.json({
      ...group,
      memberCount: group._count.members,
      eventCount: group._count.events,
      prayerCount: group._count.prayerRequests,
      isMember: !!userMembership,
      userRole: userMembership?.role || null,
      conversationId: group.conversation?.id,
      _count: undefined,
      conversation: undefined,
    })
  } catch (error) {
    console.error('Get group error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId } = params
    const body = await request.json()
    const validatedData = updateGroupSchema.parse(body)

    // Check if user is admin/owner
    const membership = await db.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId,
        },
      },
    })

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Not authorized to update this group' },
        { status: 403 }
      )
    }

    const updatedGroup = await db.group.update({
      where: { id: groupId },
      data: validatedData,
    })

    return NextResponse.json(updatedGroup)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Update group error:', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
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

    const group = await db.group.findUnique({
      where: { id: groupId },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the group owner can delete this group' },
        { status: 403 }
      )
    }

    await db.group.delete({
      where: { id: groupId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
