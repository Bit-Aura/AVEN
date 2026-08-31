import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function useYjs(sessionId: string | number | undefined, editorRef: any, userName: string = 'Anonymous', userColor: string = '#0088ff') {
  const [synced, setSynced] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!sessionId || !editorRef.current) return;

    let binding: any = null;
    let provider: WebsocketProvider | null = null;
    let ydoc: Y.Doc | null = null;

    const setup = async () => {
      // Dynamically import y-monaco to avoid SSR "window is not defined" errors
      const { MonacoBinding } = await import('y-monaco');

      // Create a new Yjs document
      ydoc = new Y.Doc();
      
      // Connect to dedicated local y-websocket server (run via `npm run yjs-server`)
      const wsUrl = process.env.NEXT_PUBLIC_YJS_URL || 'ws://localhost:1234';
      provider = new WebsocketProvider(
        wsUrl,
        `aven-p2p-session-${sessionId}`,
        ydoc
      );
      providerRef.current = provider;

      provider.on('status', (event: any) => {
        setSynced(event.status === 'connected');
      });

      // Set user awareness state for cursors
      provider.awareness.setLocalStateField('user', {
        name: userName,
        color: userColor
      });

      const ytext = ydoc.getText('monaco');
      const model = editorRef.current?.getModel();

      if (model) {
        // Bind Yjs to Monaco
        binding = new MonacoBinding(ytext, model, new Set([editorRef.current]), provider.awareness);
      }
    };

    setup();

    return () => {
      if (binding) binding.destroy();
      if (provider) provider.disconnect();
      if (ydoc) ydoc.destroy();
    };
  }, [sessionId, editorRef.current]);

  return { synced };
}
