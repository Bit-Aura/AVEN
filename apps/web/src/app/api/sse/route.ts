import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial heartbeat
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Simulate listening to BKT path updates or Redis pub/sub
      const interval = setInterval(() => {
        const updateData = {
          type: 'bkt-update',
          timestamp: Date.now(),
          newPath: [] // Fetch new graph topology
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(updateData)}\n\n`));
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
