import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12)

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Smith',
      password: hashedPassword,
      bio: 'Passionate about worship and community outreach.',
      denomination: 'Non-denominational',
      spiritualInterests: JSON.stringify(['Worship', 'Prayer', 'Community Service']),
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      state: 'NY',
      country: 'USA',
      locationSharing: true,
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      name: 'Sarah Johnson',
      password: hashedPassword,
      bio: 'Bible study leader and prayer warrior.',
      denomination: 'Baptist',
      spiritualInterests: JSON.stringify(['Bible Study', 'Prayer', 'Teaching']),
      latitude: 40.7282,
      longitude: -73.9942,
      city: 'New York',
      state: 'NY',
      country: 'USA',
      locationSharing: true,
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: 'michael@example.com' },
    update: {},
    create: {
      email: 'michael@example.com',
      name: 'Michael Davis',
      password: hashedPassword,
      bio: 'Youth ministry leader passionate about discipleship.',
      denomination: 'Pentecostal',
      spiritualInterests: JSON.stringify(['Youth Ministry', 'Discipleship', 'Music Ministry']),
      latitude: 40.758,
      longitude: -73.9855,
      city: 'New York',
      state: 'NY',
      country: 'USA',
      locationSharing: true,
    },
  })

  console.log('Created users:', { user1, user2, user3 })

  // Create a group
  const group = await prisma.group.upsert({
    where: { id: 'demo-group-1' },
    update: {},
    create: {
      id: 'demo-group-1',
      name: 'Downtown Bible Study',
      description: 'Weekly Bible study group meeting in downtown Manhattan.',
      type: 'BIBLE_STUDY',
      isPrivate: false,
      latitude: 40.7128,
      longitude: -74.006,
      city: 'New York',
      state: 'NY',
      ownerId: user1.id,
      members: {
        create: [
          { userId: user1.id, role: 'OWNER' },
          { userId: user2.id, role: 'MEMBER' },
        ],
      },
      conversation: {
        create: {
          type: 'GROUP',
          participants: {
            create: [
              { userId: user1.id },
              { userId: user2.id },
            ],
          },
        },
      },
    },
  })

  console.log('Created group:', group)

  // Create prayer requests
  const prayer1 = await prisma.prayerRequest.create({
    data: {
      title: 'Healing for my mother',
      content: 'Please pray for my mother who is recovering from surgery. We are trusting God for complete healing.',
      category: 'HEALTH',
      isAnonymous: false,
      isPrivate: false,
      userId: user2.id,
    },
  })

  const prayer2 = await prisma.prayerRequest.create({
    data: {
      title: 'Guidance for career decision',
      content: 'I am at a crossroads in my career. Please pray for wisdom and clarity as I seek God\'s direction.',
      category: 'WORK',
      isAnonymous: true,
      isPrivate: false,
      userId: user3.id,
    },
  })

  console.log('Created prayer requests:', { prayer1, prayer2 })

  // Create an event
  const event = await prisma.event.create({
    data: {
      title: 'Community Prayer Night',
      description: 'Join us for an evening of prayer and worship. All are welcome!',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
      isOnline: false,
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      latitude: 40.7128,
      longitude: -74.006,
      maxAttendees: 50,
      organizerId: user1.id,
      groupId: group.id,
      attendees: {
        create: [
          { userId: user1.id, status: 'GOING' },
          { userId: user2.id, status: 'GOING' },
          { userId: user3.id, status: 'MAYBE' },
        ],
      },
    },
  })

  console.log('Created event:', event)

  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
