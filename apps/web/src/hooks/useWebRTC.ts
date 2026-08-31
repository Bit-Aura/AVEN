import { useState, useEffect, useRef, useCallback } from 'react';

type SignalMessage = {
  type: string;
  user_id: string;
  sdp?: any;
  candidate?: any;
};

export function useWebRTC(sessionId: string | number | undefined, userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const initWebRTC = useCallback(async () => {
    if (!sessionId || !userId) return;

    // 1. Get local media
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (err) {
      console.error('Failed to get local media:', err);
      // Proceed without media if blocked, but warn user
    }

    // 2. Initialize RTCPeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    // Add local tracks to PC
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream!);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('disconnected');
      } else if (pc.iceConnectionState === 'failed') {
        setConnectionStatus('failed');
      }
    };

    // 3. Connect WebSocket for signaling
    const defaultWs = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws').replace('/api/v1', '')
      : 'ws://localhost:8000';
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWs;
    const ws = new WebSocket(`${wsUrl}/api/v1/p2p/${sessionId}/ws/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      const msg: SignalMessage = JSON.parse(event.data);

      if (msg.type === 'user_joined') {
        // Someone joined, let's create an offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
      } else if (msg.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      } else if (msg.type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      pc.close();
      ws.close();
    };
  }, [sessionId, userId]);

  useEffect(() => {
    let cleanup: any;
    initWebRTC().then(fn => { cleanup = fn; });
    
    return () => {
      if (cleanup) cleanup();
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [initWebRTC]); // Intentionally not including localStream in deps to avoid infinite loop

  // We need to re-add tracks if localStream initializes late
  useEffect(() => {
    if (localStream && pcRef.current) {
      const senders = pcRef.current.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (!sender) {
          pcRef.current?.addTrack(track, localStream);
        }
      });
    }
  }, [localStream]);

  return { localStream, remoteStream, isConnected, connectionStatus };
}
