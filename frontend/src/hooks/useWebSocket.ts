import { useRef, useCallback, useEffect } from 'react';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  url: string;
  onTranscript: (text: string) => void;
  onPointChunk: (chunk: string) => void;
  onPointComplete: (source: string, point: string) => void;
}

export function useWebSocket({
  url,
  onTranscript,
  onPointChunk,
  onPointComplete,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    shouldReconnectRef.current = true;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'transcript':
          if (msg.text) onTranscript(msg.text);
          break;
        case 'point_chunk':
          if (msg.text) onPointChunk(msg.text);
          break;
        case 'point_complete':
          if (msg.source && msg.point) onPointComplete(msg.source, msg.point);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      if (shouldReconnectRef.current) {
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 에러:', error);
    };

    wsRef.current = ws;
  }, [url, onTranscript, onPointChunk, onPointComplete]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendPause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pause' }));
    }
  }, []);

  const sendReset = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, sendAudio, sendPause, sendReset };
}
