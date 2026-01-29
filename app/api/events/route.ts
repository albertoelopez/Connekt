import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { calculateDistance } from '@/lib/utils'

const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().url().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  maxAttendees: z.number().positive().optional(),
  groupId: z.string().cuid().optional(),
})

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // my, attending, nearby, upcoming
    const groupId = searchParams.get('groupId')
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '50')

    let whereClause: any = {
      startDate: {
        gte: new Date(),
      },
    }

    if (type === 'my') {
      whereClause.organizerId = session.user.id
    } else if (type === 'attending') {
      whereClause.attendees = {
        some: {
          userId: session.user.id,
          status: { in: ['GOING', 'MAYBE'] },
        },
      }
    } else if (groupId) {
      whereClause.groupId = groupId
    }

    const events = await db.event.findMany({
      where: whereClause,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        attendees: {
          where: {
            userId: session.user.id,
          },
          select: {
            status: true,
          },
        },
        _count: {
          select: {
            attendees: {
              where: {
                status: 'GOING',
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
      take: 50,
    })

    // Calculate distance and filter
    let result = events.map((event) => ({
      ...event,
      attendeeCount: event._count.attendees,
      userRsvp: event.attendees[0]?.status || null,
      distance:
        latitude && longitude && event.latitude && event.longitude
          ? calculateDistance(latitude, longitude, event.latitude, event.longitude)
          : null,
      _count: undefined,
      attendees: undefined,
    }))

    // Filter by distance for nearby
    if (type === 'nearby' && latitude && longitude) {
      result = result
        .filter((e) => e.isOnline || (e.distance !== null && e.distance <= radius))
        .sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
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
    const validatedData = createEventSchema.parse(body)

    // If creating for a group, verify admin/owner
    if (validatedData.groupId) {
      const membership = await db.groupMember.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: validatedData.groupId,
          },
        },
      })

      if (!membership || !['OWNER', 'ADMIN', 'MODERATOR'].includes(membership.role)) {
        return NextResponse.json(
          { error: 'Not authorized to create events for this group' },
          { status: 403 }
        )
      }
    }

    const event = await db.event.create({
      data: {
        ...validatedData,
        organizerId: session.user.id,
        attendees: {
          create: {
            userId: session.user.id,
            status: 'GOING',
          },
        },
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Create event error:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
