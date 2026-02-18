import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  image: z.string().nullable().optional(),
  bio: z.string().max(500).optional(),
  denomination: z.string().optional(),
  spiritualInterests: z.array(z.string()).optional(),
  locationSharing: z.boolean().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        denomination: true,
        spiritualInterests: true,
        latitude: true,
        longitude: true,
        city: true,
        state: true,
        locationSharing: true,
        notificationsEnabled: true,
        createdAt: true,
        _count: {
          select: {
            sentConnections: {
              where: { status: 'ACCEPTED' },
            },
            receivedConnections: {
              where: { status: 'ACCEPTED' },
            },
            groupMemberships: true,
            prayerRequests: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse spiritualInterests from JSON string (SQLite stores it as string)
    let spiritualInterests: string[] = []
    if (user.spiritualInterests) {
      try {
        spiritualInterests = JSON.parse(user.spiritualInterests)
      } catch {
        spiritualInterests = []
      }
    }

    return NextResponse.json({
      ...user,
      spiritualInterests,
      connectionCount:
        user._count.sentConnections + user._count.receivedConnections,
      groupCount: user._count.groupMemberships,
      prayerCount: user._count.prayerRequests,
      _count: undefined,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Transform spiritualInterests array to JSON string for SQLite storage
    const dataToSave: Record<string, unknown> = { ...validatedData }
    if (validatedData.spiritualInterests) {
      dataToSave.spiritualInterests = JSON.stringify(validatedData.spiritualInterests)
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: dataToSave,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        denomination: true,
        spiritualInterests: true,
        city: true,
        state: true,
        locationSharing: true,
        notificationsEnabled: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
