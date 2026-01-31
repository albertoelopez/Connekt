import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const rsvpSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
})

export async function POST(
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
    const { status } = rsvpSchema.parse(body)

    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            attendees: {
              where: { status: 'GOING' },
            },
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check max attendees
    if (
      status === 'GOING' &&
      event.maxAttendees &&
      event._count.attendees >= event.maxAttendees
    ) {
      return NextResponse.json(
        { error: 'Event is at full capacity' },
        { status: 400 }
      )
    }

    // Upsert attendee
    const attendee = await db.eventAttendee.upsert({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
      update: { status },
      create: {
        userId: session.user.id,
        eventId,
        status,
      },
    })

    // Get updated count
    const attendeeCount = await db.eventAttendee.count({
      where: {
        eventId,
        status: 'GOING',
      },
    })

    return NextResponse.json({
      ...attendee,
      attendeeCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('RSVP error:', error)
    return NextResponse.json(
      { error: 'Failed to update RSVP' },
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

    await db.eventAttendee.delete({
      where: {
        userId_eventId: {
          userId: session.user.id,
          eventId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel RSVP error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel RSVP' },
      { status: 500 }
    )
  }
}
