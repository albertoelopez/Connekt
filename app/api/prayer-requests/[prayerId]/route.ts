import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updatePrayerSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  content: z.string().min(10).max(2000).optional(),
  isAnswered: z.boolean().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: { prayerId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prayerId } = params

    const prayer = await db.prayerRequest.findUnique({
      where: { id: prayerId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    })

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
    }

    // Check access for private prayers
    if (prayer.isPrivate && prayer.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const hasPrayed = prayer.responses.some((r) => r.user.id === session.user.id)

    return NextResponse.json({
      ...prayer,
      prayerCount: prayer._count.responses,
      hasPrayed,
      user: prayer.isAnonymous && prayer.userId !== session.user.id
        ? { id: 'anonymous', name: 'Anonymous', image: null }
        : prayer.user,
      _count: undefined,
    })
  } catch (error) {
    console.error('Get prayer error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prayer' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { prayerId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prayerId } = params
    const body = await request.json()
    const validatedData = updatePrayerSchema.parse(body)

    const prayer = await db.prayerRequest.findUnique({
      where: { id: prayerId },
    })

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
    }

    if (prayer.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to update this prayer' },
        { status: 403 }
      )
    }

    const updatedPrayer = await db.prayerRequest.update({
      where: { id: prayerId },
      data: {
        ...validatedData,
        answeredAt: validatedData.isAnswered ? new Date() : undefined,
      },
    })

    // If marked as answered, notify those who prayed
    if (validatedData.isAnswered && !prayer.isAnswered) {
      const responses = await db.prayerResponse.findMany({
        where: { prayerRequestId: prayerId },
      })

      for (const response of responses) {
        await db.notification.create({
          data: {
            userId: response.userId,
            type: 'PRAYER_ANSWERED',
            title: 'Prayer Answered!',
            body: `"${prayer.title}" has been marked as answered!`,
            link: `/prayers`,
          },
        })
      }
    }

    return NextResponse.json(updatedPrayer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Update prayer error:', error)
    return NextResponse.json(
      { error: 'Failed to update prayer' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { prayerId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prayerId } = params

    const prayer = await db.prayerRequest.findUnique({
      where: { id: prayerId },
    })

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
    }

    if (prayer.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this prayer' },
        { status: 403 }
      )
    }

    await db.prayerRequest.delete({
      where: { id: prayerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete prayer error:', error)
    return NextResponse.json(
      { error: 'Failed to delete prayer' },
      { status: 500 }
    )
  }
}
