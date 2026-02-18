import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const type = searchParams.get('type') || 'all'

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 })
    }

    const results: {
      users?: any[]
      groups?: any[]
      events?: any[]
      prayers?: any[]
    } = {}

    // Search Users
    if (type === 'all' || type === 'users') {
      results.users = await db.user.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { bio: { contains: query } },
          ],
          id: { not: session.user.id },
        },
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          denomination: true,
          city: true,
          state: true,
          isOnline: true,
        },
        take: 10,
      })
    }

    // Search Groups
    if (type === 'all' || type === 'groups') {
      results.groups = await db.group.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
          ],
          isPrivate: false,
        },
        select: {
          id: true,
          name: true,
          description: true,
          image: true,
          type: true,
          city: true,
          state: true,
          _count: {
            select: { members: true },
          },
        },
        take: 10,
      })
    }

    // Search Events
    if (type === 'all' || type === 'events') {
      results.events = await db.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          image: true,
          startDate: true,
          endDate: true,
          isOnline: true,
          city: true,
          state: true,
          _count: {
            select: { attendees: true },
          },
          organizer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
        take: 10,
      })
    }

    // Search Prayer Requests
    if (type === 'all' || type === 'prayers') {
      results.prayers = await db.prayerRequest.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
          isPrivate: false,
          isAnonymous: false,
        },
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          isAnswered: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: { responses: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}
