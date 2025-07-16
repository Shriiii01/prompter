from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.models.request import WebSocketMessage, EnhanceRequest, LLMModel
from app.core.enhancer import PromptEnhancer
from app.core.analyzer import PromptAnalyzer
from config import settings
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_json(self, websocket: WebSocket, data: dict):
        await websocket.send_json(data)

manager = ConnectionManager()

async def handle_enhance(payload: dict, enhancer: PromptEnhancer) -> dict:
    """Handle enhancement request"""
    try:
        request = EnhanceRequest(
            prompt=payload["prompt"],
            target_model=LLMModel(payload["target_model"]),
            context=payload.get("context")
        )
        
        result = await enhancer.enhance(
            prompt=request.prompt,
            target_model=request.target_model,
            context=request.context
        )
        
        return {
            "type": "enhancement_result",
            "data": result.dict(),
            "error": None
        }
    except Exception as e:
        logger.error(f"Enhancement error: {str(e)}")
        return {
            "type": "error",
            "data": None,
            "error": str(e)
        }

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time enhancement"""
    await manager.connect(websocket)
    
    enhancer = PromptEnhancer(
        openai_key=settings.openai_api_key,
        anthropic_key=settings.anthropic_api_key,
        google_key=settings.google_api_key
    )
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            message = WebSocketMessage(**data)
            
            # Handle different message types
            if message.type == "enhance":
                response = await handle_enhance(message.payload, enhancer)
                response["id"] = message.id
                await manager.send_json(websocket, response)
            
            elif message.type == "analyze":
                # Quick analysis without enhancement
                analyzer = PromptAnalyzer()
                analysis = analyzer.analyze(message.payload["prompt"])
                await manager.send_json(websocket, {
                    "type": "analysis_result",
                    "data": analysis.dict(),
                    "error": None,
                    "id": message.id
                })
            
            elif message.type == "ping":
                await manager.send_json(websocket, {
                    "type": "pong",
                    "id": message.id
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)