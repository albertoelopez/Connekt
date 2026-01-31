import { db } from './db'

interface PushPayload {
  title: string
  body: string
  url?: string
  actions?: Array<{
    action: string
    title: string
  }>
}

// Web Push requires the web-push library for sending notifications
// This is a simplified implementation that stores the subscription and
// can be extended with actual web-push integration

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    })

    if (subscriptions.length === 0) {
      return false
    }

    // In a production environment, you would use the web-push library:
    // const webpush = require('web-push')
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    //   process.env.VAPID_PRIVATE_KEY!
    // )
    //
    // for (const subscription of subscriptions) {
    //   try {
    //     await webpush.sendNotification(
    //       {
    //         endpoint: subscription.endpoint,
    //         keys: {
    //           p256dh: subscription.p256dh,
    //           auth: subscription.auth,
    //         },
    //       },
    //       JSON.stringify(payload)
    //     )
    //   } catch (error) {
    //     // If subscription is invalid, remove it
    //     if ((error as any).statusCode === 410) {
    //       await db.pushSubscription.delete({
    //         where: { id: subscription.id },
    //       })
    //     }
    //   }
    // }

    // For now, we log that we would send a notification
    console.log(`Would send push notification to user ${userId}:`, payload)

    return true
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return false
  }
}

export async function sendPushToMultipleUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  await Promise.all(
    userIds.map((userId) => sendPushNotification(userId, payload))
  )
}

// Helper function to create a notification and optionally send a push
export async function createNotificationWithPush(
  userId: string,
  notification: {
    type: string
    title: string
    body: string
    link?: string
  },
  sendPush = true
): Promise<void> {
  // Create database notification
  await db.notification.create({
    data: {
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
    },
  })

  // Send push notification if enabled
  if (sendPush) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { notificationsEnabled: true },
    })

    if (user?.notificationsEnabled) {
      await sendPushNotification(userId, {
        title: notification.title,
        body: notification.body,
        url: notification.link,
      })
    }
  }
}
