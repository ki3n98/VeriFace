from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections grouped by session_id."""

    def __init__(self):
        # Dict mapping session_id -> list of connected WebSocket clients
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"[WS] Client connected to session {session_id} (total: {len(self.active_connections[session_id])})")

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        print(f"[WS] Client disconnected from session {session_id}")

    async def broadcast_to_session(self, session_id: int, data: dict):
        """Send data to ALL clients watching a specific session."""
        connections = self.active_connections.get(session_id, [])
        print(f"[WS] Broadcasting to session {session_id}: {len(connections)} client(s)")
        for connection in connections:
            try:
                await connection.send_json(data)
                print(f"[WS] Sent successfully")
            except Exception as e:
                print(f"[WS] Send failed: {e}")


# Single global instance shared across the app
manager = ConnectionManager()
