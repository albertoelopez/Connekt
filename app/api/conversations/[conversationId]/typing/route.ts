import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sseManager } from '@/lib/sse'

export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = params
    const { isTyping } = await request.json()

    // Verify user is participant
    const participant = await db.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: session.user.id,
          conversationId,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant of this conversation' },
        { status: 403 }
      )
    }

    // Send typing indicator via SSE
    sseManager.sendToConversation(
      conversationId,
      isTyping ? 'typing-start' : 'typing-stop',
      {
        userId: session.user.id,
        userName: session.user.name,
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Typing indicator error:', error)
    return NextResponse.json(
      { error: 'Failed to send typing indicator' },
      { status: 500 }
    )
  }
}
