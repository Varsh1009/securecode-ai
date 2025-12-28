from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import asyncio
import redis.asyncio as aioredis

router = APIRouter()

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis_client = None
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        print(f"Client {client_id} connected. Total connections: {sum(len(conns) for conns in self.active_connections.values())}")
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        print(f"Client {client_id} disconnected")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast_to_client(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[client_id].discard(conn)
    
    async def broadcast_to_all(self, message: dict):
        for client_id in list(self.active_connections.keys()):
            await self.broadcast_to_client(message, client_id)

manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time analysis updates
    """
    await manager.connect(websocket, client_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "message": "Connected to SecureCode AI"
        }, websocket)
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": message.get("timestamp")
                }, websocket)
            
            elif message.get("type") == "analyze":
                # Queue analysis and send back result
                await manager.send_personal_message({
                    "type": "analysis_queued",
                    "analysis_id": message.get("analysis_id"),
                    "status": "processing"
                }, websocket)
                
                # Simulate processing (replace with actual analysis later)
                await asyncio.sleep(0.5)
                
                # Send result
                await manager.send_personal_message({
                    "type": "analysis_result",
                    "analysis_id": message.get("analysis_id"),
                    "status": "completed",
                    "vulnerabilities": []
                }, websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        print(f"Client {client_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, client_id)

@router.get("/ws/clients")
async def get_connected_clients():
    """
    Get number of connected WebSocket clients
    """
    return {
        "total_clients": len(manager.active_connections),
        "total_connections": sum(len(conns) for conns in manager.active_connections.values())
    }