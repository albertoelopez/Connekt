import { auth } from '@/lib/auth'
import { sseManager } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const clientId = `${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const stream = new ReadableStream({
    start(controller) {
      // Register client
      sseManager.addClient(clientId, controller, session.user.id)

      // Send initial connection message
      const connectMessage = `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMessage))

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          const ping = `event: ping\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`
          controller.enqueue(new TextEncoder().encode(ping))
        } catch {
          clearInterval(pingInterval)
          sseManager.removeClient(clientId)
        }
      }, 30000)

      // Cleanup on close
      return () => {
        clearInterval(pingInterval)
        sseManager.removeClient(clientId)
      }
    },
    cancel() {
      sseManager.removeClient(clientId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
