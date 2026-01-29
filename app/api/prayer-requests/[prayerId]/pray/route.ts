import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: { prayerId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prayerId } = params
    const body = await request.json().catch(() => ({}))
    const message = body.message as string | undefined

    const prayer = await db.prayerRequest.findUnique({
      where: { id: prayerId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    if (!prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
    }

    // Check if already prayed
    const existingResponse = await db.prayerResponse.findUnique({
      where: {
        userId_prayerRequestId: {
          userId: session.user.id,
          prayerRequestId: prayerId,
        },
      },
    })

    if (existingResponse) {
      return NextResponse.json(
        { error: 'Already praying for this request' },
        { status: 400 }
      )
    }

    // Create prayer response
    const response = await db.prayerResponse.create({
      data: {
        userId: session.user.id,
        prayerRequestId: prayerId,
        message,
      },
    })

    // Create notification for prayer requester (if not anonymous and not self)
    if (prayer.userId !== session.user.id) {
      await db.notification.create({
        data: {
          userId: prayer.userId,
          type: 'PRAYER_RESPONSE',
          title: 'Someone is Praying',
          body: `${session.user.name} is praying for "${prayer.title}"`,
          link: `/prayers`,
        },
      })
    }

    // Get updated count
    const count = await db.prayerResponse.count({
      where: { prayerRequestId: prayerId },
    })

    return NextResponse.json({
      ...response,
      prayerCount: count,
    })
  } catch (error) {
    console.error('Pray error:', error)
    return NextResponse.json(
      { error: 'Failed to record prayer' },
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

    await db.prayerResponse.delete({
      where: {
        userId_prayerRequestId: {
          userId: session.user.id,
          prayerRequestId: prayerId,
        },
      },
    })

    // Get updated count
    const count = await db.prayerResponse.count({
      where: { prayerRequestId: prayerId },
    })

    return NextResponse.json({ success: true, prayerCount: count })
  } catch (error) {
    console.error('Remove prayer error:', error)
    return NextResponse.json(
      { error: 'Failed to remove prayer' },
      { status: 500 }
    )
  }
}
