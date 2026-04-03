import { useEffect, useRef, useState } from "react";

//whoever wrote useWebSocket, I jacked your stuff. Ty for code =)
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") || "ws://localhost:80";

export function useBreakoutWebSocket(
  sessionId: number | null,
  onBreakoutUpdate: (data: any) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Store callback in ref so WebSocket doesn't reconnect when callback changes
  const onUpdateRef = useRef(onBreakoutUpdate);
  onUpdateRef.current = onBreakoutUpdate;

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws/breakout/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "breakout_update") {
          onUpdateRef.current(message.data);
        }
      } catch (e) {
        console.error("[WebSocket] Failed to parse message:", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  return { isConnected };
}
