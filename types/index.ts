import { User, Group, Message, PrayerRequest, Event, Connection, Conversation } from '@prisma/client'

// Extended types with relations
export type UserWithConnections = User & {
  sentConnections?: Connection[]
  receivedConnections?: Connection[]
}

export type ConnectionWithUsers = Connection & {
  sender: User
  receiver: User
}

export type ConversationWithParticipants = Conversation & {
  participants: User[]
  messages: Message[]
}

export type MessageWithSender = Message & {
  sender: User
  replyTo?: Message | null
}

export type GroupWithMembers = Group & {
  members: {
    user: User
    role: string
  }[]
  _count: {
    members: number
  }
}

export type PrayerRequestWithUser = PrayerRequest & {
  user: User
  _count: {
    responses: number
  }
}

export type EventWithOrganizer = Event & {
  organizer: User
  group?: Group | null
  _count: {
    attendees: number
  }
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Location types
export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationState {
  coordinates: Coordinates | null
  error: string | null
  loading: boolean
}

// Pusher event types
export interface TypingEvent {
  conversationId: string
  userId: string
  userName: string
}

export interface MessageEvent {
  message: MessageWithSender
  conversationId: string
}

export interface PresenceUser {
  id: string
  name: string
  image: string | null
}

// Form types
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ProfileFormData {
  name: string
  bio: string
  denomination: string
  spiritualInterests: string[]
  locationSharing: boolean
}

export interface GroupFormData {
  name: string
  description: string
  type: 'CHURCH' | 'BIBLE_STUDY' | 'PRAYER_CIRCLE' | 'FELLOWSHIP' | 'OTHER'
  isPrivate: boolean
  latitude?: number
  longitude?: number
  city?: string
  state?: string
}

export interface PrayerRequestFormData {
  title: string
  content: string
  isAnonymous: boolean
  isPrivate: boolean
  category: 'HEALTH' | 'FAMILY' | 'WORK' | 'SPIRITUAL' | 'RELATIONSHIPS' | 'FINANCIAL' | 'OTHER'
}

export interface EventFormData {
  title: string
  description: string
  startDate: Date
  endDate?: Date
  isOnline: boolean
  meetingUrl?: string
  latitude?: number
  longitude?: number
  address?: string
  maxAttendees?: number
}

// Spiritual interests
export const SPIRITUAL_INTERESTS = [
  'Prayer',
  'Worship',
  'Bible Study',
  'Evangelism',
  'Missions',
  'Youth Ministry',
  'Women\'s Ministry',
  'Men\'s Ministry',
  'Marriage',
  'Parenting',
  'Healing',
  'Prophecy',
  'Leadership',
  'Discipleship',
  'Community Service',
  'Music Ministry',
  'Teaching',
  'Counseling',
] as const

// Denominations
export const DENOMINATIONS = [
  'Non-denominational',
  'Baptist',
  'Pentecostal',
  'Catholic',
  'Methodist',
  'Presbyterian',
  'Lutheran',
  'Anglican/Episcopal',
  'Assembly of God',
  'Church of God',
  'Charismatic',
  'Evangelical',
  'Reformed',
  'Orthodox',
  'Other',
] as const
