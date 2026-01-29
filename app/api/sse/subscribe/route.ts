import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sseManager } from '@/lib/sse'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clientId, channel, action } = await request.json()

    if (!clientId || !channel) {
      return NextResponse.json(
        { error: 'Missing clientId or channel' },
        { status: 400 }
      )
    }

    if (action === 'unsubscribe') {
      sseManager.unsubscribe(clientId, channel)
    } else {
      sseManager.subscribe(clientId, channel)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SSE subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
