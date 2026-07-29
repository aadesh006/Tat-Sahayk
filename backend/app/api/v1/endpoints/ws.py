from typing import List
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.debug(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.debug(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
            
        message_str = json.dumps(message)
        # We must iterate over a copy of the list because it might change during iteration
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message_str)
            except Exception as e:
                logger.error(f"Error broadcasting to a websocket: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from the client in this one-way broadcast design,
            # but we need to receive to detect disconnects gracefully.
            data = await websocket.receive_text()
            # If the client sends ping messages, we could reply with pong, 
            # but usually the browser handles low-level pings.
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket unexpected error: {e}")
        manager.disconnect(websocket)
