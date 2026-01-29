import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint, p256dh, auth: authKey } = await request.json()

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json(
        { error: 'Missing subscription data' },
        { status: 400 }
      )
    }

    // Upsert push subscription
    await db.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth: authKey,
        userId: session.user.id,
      },
      create: {
        userId: session.user.id,
        endpoint,
        p256dh,
        auth: authKey,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
