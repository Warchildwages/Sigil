// In-memory event bus for meeting room real-time sync via SSE.
// No external dependencies. Same module-level Map pattern as rate limiter.
//
// Each meeting room has a set of ResponseWriters (SSE connections).
// When state changes, all connections in the room receive the event.

type SSEClient = {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
};

const meetingRooms = new Map<string, Set<SSEClient>>();

function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Add an SSE client to a meeting room.
 * Returns a cleanup function to remove on disconnect.
 */
export function addSSEClient(
  meetingId: string,
  controller: ReadableStreamDefaultController,
): () => void {
  const client: SSEClient = {
    controller,
    encoder: new TextEncoder(),
  };

  if (!meetingRooms.has(meetingId)) {
    meetingRooms.set(meetingId, new Set());
  }
  meetingRooms.get(meetingId)!.add(client);

  return () => {
    const room = meetingRooms.get(meetingId);
    if (room) {
      room.delete(client);
      if (room.size === 0) {
        meetingRooms.delete(meetingId);
      }
    }
  };
}

/**
 * Broadcast an event to all SSE clients in a meeting room.
 */
export function broadcastToRoom(
  meetingId: string,
  event: string,
  data: unknown,
): void {
  const room = meetingRooms.get(meetingId);
  if (!room) return;

  const message = encodeSSE(event, data);
  for (const client of room) {
    try {
      client.controller.enqueue(client.encoder.encode(message));
    } catch {
      // Client disconnected — cleanup on next iteration
      room.delete(client);
    }
  }
}