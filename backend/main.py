from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import base64
import asyncio

app = FastAPI(title="Zynk API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class HealthResponse(BaseModel):
    status: str
    message: str

class Item(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    quantity: int = 1

# Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Zynk API"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", message="Server is running")

@app.get("/api/items")
async def get_items():
    """Get all items"""
    return {
        "items": [
            {"id": 1, "name": "Item 1", "price": 10.99},
            {"id": 2, "name": "Item 2", "price": 20.99},
        ]
    }

@app.post("/api/items")
async def create_item(item: Item):
    """Create a new item"""
    return {
        "message": "Item created successfully",
        "item": item.dict()
    }

@app.get("/api/items/{item_id}")
async def get_item(item_id: int):
    """Get a specific item by ID"""
    return {
        "id": item_id,
        "name": f"Item {item_id}",
        "price": 10.99 * item_id
    }

# WebSocket endpoint for real-time video processing
@app.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time video frame processing"""
    await websocket.accept()
    print("WebSocket connection established")
    
    try:
        frame_count = 0
        feedback_messages = [
            "Position yourself in the center",
            "Move closer to the camera",
            "Perfect! Hold still",
            "Great! You're all set",
            "Looking good!",
            "Adjust your lighting",
        ]
        
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "frame":
                frame_count += 1
                
                # Here you can process the frame (base64 encoded image)
                # For now, we'll send periodic feedback
                
                # Send feedback every 30 frames (roughly every second at 30fps)
                if frame_count % 30 == 0:
                    feedback_index = (frame_count // 30) % len(feedback_messages)
                    feedback = {
                        "type": "feedback",
                        "message": feedback_messages[feedback_index],
                        "timestamp": frame_count
                    }
                    await websocket.send_json(feedback)
                
                # Send acknowledgment
                if frame_count % 60 == 0:
                    status = {
                        "type": "status",
                        "frames_processed": frame_count,
                        "message": "Processing..."
                    }
                    await websocket.send_json(status)
                    
            elif message.get("type") == "ping":
                # Respond to ping messages to keep connection alive
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        print("WebSocket connection closed")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
