import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { calculateDistance } from '@/lib/utils'

const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['CHURCH', 'BIBLE_STUDY', 'PRAYER_CIRCLE', 'FELLOWSHIP', 'OTHER']),
  isPrivate: z.boolean().default(false),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // my, nearby, all
    const groupType = searchParams.get('groupType')
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '50')
    const search = searchParams.get('search')

    let whereClause: any = {}

    if (type === 'my') {
      whereClause = {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      }
    } else if (!groupType || groupType === 'all') {
      whereClause = {
        isPrivate: false,
      }
    } else {
      whereClause = {
        type: groupType,
        isPrivate: false,
      }
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const groups = await db.group.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
        members: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Calculate distance if coordinates provided
    let result = groups.map((group) => ({
      ...group,
      memberCount: group._count.members,
      userRole: group.members[0]?.role || null,
      isMember: group.members.length > 0,
      distance:
        latitude && longitude && group.latitude && group.longitude
          ? calculateDistance(latitude, longitude, group.latitude, group.longitude)
          : null,
      _count: undefined,
      members: undefined,
    }))

    // Filter by distance if nearby search
    if (type === 'nearby' && latitude && longitude) {
      result = result
        .filter((g) => g.distance !== null && g.distance <= radius)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
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
    const validatedData = createGroupSchema.parse(body)

    // Create group with owner as admin member
    const group = await db.group.create({
      data: {
        ...validatedData,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
        conversation: {
          create: {
            type: 'GROUP',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Create group error:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
