import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateEventSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().url().optional().nullable(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxAttendees: z.number().int().min(1).optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params

    const event = await db.event.findUnique({
      where: { id: eventId },
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
            image: true,
          },
        },
        attendees: {
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
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            attendees: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const userRsvp = event.attendees.find(
      (a) => a.user.id === session.user.id
    )

    return NextResponse.json({
      ...event,
      attendeeCount: event._count.attendees,
      userRsvp: userRsvp?.status || null,
      isOrganizer: event.organizerId === session.user.id,
      _count: undefined,
    })
  } catch (error) {
    console.error('Get event error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params
    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)

    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the organizer can update this event' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = { ...validatedData }
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate)
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate)
    }

    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: updateData,
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = params

    const event = await db.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the organizer can delete this event' },
        { status: 403 }
      )
    }

    await db.event.delete({
      where: { id: eventId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
