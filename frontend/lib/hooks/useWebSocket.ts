import { useEffect, useRef, useState } from "react";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") || "ws://localhost:80";

export function useSessionWebSocket(
  sessionId: number | null,
  onCheckIn: (data: any) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Store callback in ref so WebSocket doesn't reconnect when callback changes
  const onCheckInRef = useRef(onCheckIn);
  onCheckInRef.current = onCheckIn;

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(
      `${WS_BASE_URL}/ws/session/${sessionId}`,
    );
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "checkin") {
          onCheckInRef.current(message.data);
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

    // Cleanup: close WebSocket when session changes or component unmounts
    return () => {
      ws.close();
    };
  }, [sessionId]);

  return { isConnected };
}
