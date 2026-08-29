from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set

router = APIRouter(prefix="/p2p", tags=["p2p_ws"])

# A simple ConnectionManager to handle WebSockets for signaling
class ConnectionManager:
    def __init__(self):
        # Maps session_id -> user_id -> WebSocket
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}
        self.active_connections[session_id][user_id] = websocket

    def disconnect(self, session_id: str, user_id: str):
        if session_id in self.active_connections:
            if user_id in self.active_connections[session_id]:
                del self.active_connections[session_id][user_id]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_session(self, session_id: str, message: dict, sender_id: str = None):
        if session_id in self.active_connections:
            for user_id, connection in self.active_connections[session_id].items():
                if user_id != sender_id:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass # Ignore send errors for disconnected clients

manager = ConnectionManager()

@router.websocket("/{session_id}/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, user_id: str):
    await manager.connect(websocket, session_id, user_id)
    try:
        # Notify others that this user joined
        await manager.broadcast_to_session(session_id, {"type": "user_joined", "user_id": user_id}, sender_id=user_id)
        
        while True:
            data = await websocket.receive_json()
            # Expecting data format: {"type": "offer"|"answer"|"ice-candidate"|"chat"|..., ...}
            # Just route the message to the other participant in the session
            await manager.broadcast_to_session(session_id, data, sender_id=user_id)
            
    except WebSocketDisconnect:
        manager.disconnect(session_id, user_id)
        await manager.broadcast_to_session(session_id, {"type": "user_left", "user_id": user_id})
