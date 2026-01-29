// Server-Sent Events manager for real-time updates
// This replaces Pusher with a free, self-hosted solution

type SSEClient = {
  id: string
  controller: ReadableStreamDefaultController
  userId: string
  channels: Set<string>
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map()

  addClient(
    id: string,
    controller: ReadableStreamDefaultController,
    userId: string
  ): void {
    this.clients.set(id, {
      id,
      controller,
      userId,
      channels: new Set([`user-${userId}`]),
    })
  }

  removeClient(id: string): void {
    this.clients.delete(id)
  }

  subscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.channels.add(channel)
    }
  }

  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      client.channels.delete(channel)
    }
  }

  // Send event to a specific channel
  sendToChannel(channel: string, event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

    this.clients.forEach((client) => {
      if (client.channels.has(channel)) {
        try {
          client.controller.enqueue(new TextEncoder().encode(message))
        } catch {
          // Client disconnected, remove it
          this.removeClient(client.id)
        }
      }
    })
  }

  // Send event to a specific user
  sendToUser(userId: string, event: string, data: unknown): void {
    this.sendToChannel(`user-${userId}`, event, data)
  }

  // Send event to all participants in a conversation
  sendToConversation(
    conversationId: string,
    event: string,
    data: unknown
  ): void {
    this.sendToChannel(`conversation-${conversationId}`, event, data)
  }

  // Get count of connected clients (for debugging)
  getClientCount(): number {
    return this.clients.size
  }
}

// Global SSE manager instance
export const sseManager = new SSEManager()
