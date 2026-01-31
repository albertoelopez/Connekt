import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sseManager } from '@/lib/sse'
import { z } from 'zod'

const updateMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

export async function PATCH(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = params
    const body = await request.json()
    const { content } = updateMessageSchema.parse(body)

    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true,
          },
        },
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the sender can edit this message' },
        { status: 403 }
      )
    }

    if (message.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot edit a deleted message' },
        { status: 400 }
      )
    }

    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Notify conversation participants via SSE
    sseManager.sendToConversation(
      message.conversationId,
      'message-updated',
      updatedMessage
    )

    return NextResponse.json(updatedMessage)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Update message error:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = params

    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the sender can delete this message' },
        { status: 403 }
      )
    }

    // Soft delete
    await db.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    })

    // Notify conversation participants via SSE
    sseManager.sendToConversation(
      message.conversationId,
      'message-deleted',
      { id: messageId }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
