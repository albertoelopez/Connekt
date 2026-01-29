import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createPrayerSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(10).max(2000),
  category: z.enum(['HEALTH', 'FAMILY', 'WORK', 'SPIRITUAL', 'RELATIONSHIPS', 'FINANCIAL', 'OTHER']),
  isAnonymous: z.boolean().default(false),
  isPrivate: z.boolean().default(false),
  groupId: z.string().cuid().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // my, feed, answered, group
    const groupId = searchParams.get('groupId')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    let whereClause: any = {}

    if (type === 'my') {
      whereClause = { userId: session.user.id }
    } else if (type === 'answered') {
      whereClause = {
        isAnswered: true,
        OR: [
          { isPrivate: false },
          { userId: session.user.id },
        ],
      }
    } else if (type === 'group' && groupId) {
      // Verify membership
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
          { status: 403 }
        )
      }

      whereClause = { groupId }
    } else {
      // Public feed - show public prayers from connections
      const connections = await db.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { senderId: session.user.id },
            { receiverId: session.user.id },
          ],
        },
      })

      const connectedUserIds = connections.map((c) =>
        c.senderId === session.user.id ? c.receiverId : c.senderId
      )

      whereClause = {
        isPrivate: false,
        groupId: null,
        OR: [
          { userId: session.user.id },
          { userId: { in: connectedUserIds } },
        ],
      }
    }

    if (category && category !== 'all') {
      whereClause.category = category
    }

    const [prayers, total] = await Promise.all([
      db.prayerRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              responses: true,
            },
          },
          responses: {
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.prayerRequest.count({ where: whereClause }),
    ])

    const transformedPrayers = prayers.map((prayer) => ({
      ...prayer,
      prayerCount: prayer._count.responses,
      hasPrayed: prayer.responses.length > 0,
      user: prayer.isAnonymous && prayer.userId !== session.user.id
        ? { id: 'anonymous', name: 'Anonymous', image: null }
        : prayer.user,
      _count: undefined,
      responses: undefined,
    }))

    return NextResponse.json({
      data: transformedPrayers,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    })
  } catch (error) {
    console.error('Get prayers error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prayers' },
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
    const validatedData = createPrayerSchema.parse(body)

    // If posting to group, verify membership
    if (validatedData.groupId) {
      const membership = await db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: validatedData.groupId,
          },
        },
      })

      if (!membership) {
        return NextResponse.json(
          { error: 'Not a member of this group' },
          { status: 403 }
        )
      }
    }

    const prayer = await db.prayerRequest.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        ...prayer,
        prayerCount: 0,
        hasPrayed: false,
        _count: undefined,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Create prayer error:', error)
    return NextResponse.json(
      { error: 'Failed to create prayer request' },
      { status: 500 }
    )
  }
}
