// GET /api/meeting/[id]/stream — Server-Sent Events for real-time meeting sync
// No external dependencies. Uses ReadableStream (Node.js 18+ / Edge).
// Replaces 2s polling with push-based updates.
//
// Clients connect via EventSource:
//   const es = new EventSource('/api/meeting/xxx/stream');
//   es.addEventListener('state_update', (e) => { ... });

import { addSSEClient } from '@/lib/meeting-events';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const meetingId = params.id;

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = addSSEClient(meetingId, controller);

      // Send initial connection event
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ meetingId })}\n\n`),
      );

      // Keep alive every 30s to prevent proxy timeout
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
          cleanup();
        }
      }, 30_000);

      // Cleanup on disconnect
      _request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}