import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { calculateDistance } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const latitude = parseFloat(searchParams.get('latitude') || '0')
    const longitude = parseFloat(searchParams.get('longitude') || '0')
    const radius = parseInt(searchParams.get('radius') || '50') // miles
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    // Get blocked user IDs
    const blockedConnections = await db.connection.findMany({
      where: {
        OR: [
          { senderId: session.user.id, status: 'BLOCKED' },
          { receiverId: session.user.id, status: 'BLOCKED' },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    })

    const blockedUserIds = blockedConnections.map((c) =>
      c.senderId === session.user.id ? c.receiverId : c.senderId
    )

    // Bounding box for initial filter (rough approximation)
    const latDelta = radius / 69 // 1 degree latitude ≈ 69 miles
    const lonDelta = radius / (69 * Math.cos(latitude * (Math.PI / 180)))

    const users = await db.user.findMany({
      where: {
        id: {
          not: session.user.id,
          notIn: blockedUserIds,
        },
        locationSharing: true,
        latitude: {
          gte: latitude - latDelta,
          lte: latitude + latDelta,
        },
        longitude: {
          gte: longitude - lonDelta,
          lte: longitude + lonDelta,
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        denomination: true,
        spiritualInterests: true,
        latitude: true,
        longitude: true,
        city: true,
        state: true,
        isOnline: true,
        lastSeen: true,
      },
    })

    // Calculate actual distance and filter
    const usersWithDistance = users
      .map((user) => ({
        ...user,
        distance: calculateDistance(
          latitude,
          longitude,
          user.latitude!,
          user.longitude!
        ),
      }))
      .filter((user) => user.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    const total = usersWithDistance.length
    const skip = (page - 1) * pageSize
    const paginatedUsers = usersWithDistance.slice(skip, skip + pageSize)

    // Get connection status for each user
    const connections = await db.connection.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: { in: paginatedUsers.map((u) => u.id) },
          },
          {
            receiverId: session.user.id,
            senderId: { in: paginatedUsers.map((u) => u.id) },
          },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
        status: true,
      },
    })

    const usersWithConnectionStatus = paginatedUsers.map((user) => {
      const connection = connections.find(
        (c) =>
          (c.senderId === session.user.id && c.receiverId === user.id) ||
          (c.receiverId === session.user.id && c.senderId === user.id)
      )

      return {
        ...user,
        connectionStatus: connection?.status || null,
        isConnectionSender: connection?.senderId === session.user.id || false,
      }
    })

    return NextResponse.json({
      data: usersWithConnectionStatus,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    })
  } catch (error) {
    console.error('Nearby users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch nearby users' },
      { status: 500 }
    )
  }
}
