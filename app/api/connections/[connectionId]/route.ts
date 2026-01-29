import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateConnectionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'BLOCKED']),
})

export async function PATCH(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = params
    const body = await request.json()
    const { status } = updateConnectionSchema.parse(body)

    const connection = await db.connection.findUnique({
      where: { id: connectionId },
      include: {
        sender: {
          select: { id: true, name: true },
        },
        receiver: {
          select: { id: true, name: true },
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Only the receiver can accept/reject
    // Either party can block
    if (
      status !== 'BLOCKED' &&
      connection.receiverId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Not authorized to update this connection' },
        { status: 403 }
      )
    }

    if (
      status === 'BLOCKED' &&
      connection.senderId !== session.user.id &&
      connection.receiverId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Not authorized to update this connection' },
        { status: 403 }
      )
    }

    const updatedConnection = await db.connection.update({
      where: { id: connectionId },
      data: { status },
    })

    // Create notification for sender if accepted
    if (status === 'ACCEPTED') {
      await db.notification.create({
        data: {
          userId: connection.senderId,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted',
          body: `${connection.receiver.name} accepted your connection request`,
          link: `/profile/${connection.receiverId}`,
        },
      })
    }

    return NextResponse.json(updatedConnection)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Update connection error:', error)
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = params

    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      )
    }

    // Only participants can delete
    if (
      connection.senderId !== session.user.id &&
      connection.receiverId !== session.user.id
    ) {
      return NextResponse.json(
        { error: 'Not authorized to delete this connection' },
        { status: 403 }
      )
    }

    await db.connection.delete({
      where: { id: connectionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete connection error:', error)
    return NextResponse.json(
      { error: 'Failed to delete connection' },
      { status: 500 }
    )
  }
}
