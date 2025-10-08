from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
import base64
import asyncio
import uuid
from video_recorder import VideoRecorder, upload_to_supabase, get_user_videos

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

@app.get("/api/videos/{user_id}")
async def get_videos(user_id: str):
    """Get all videos for a specific user"""
    try:
        videos = await get_user_videos(user_id)
        
        if videos is None:
            return {
                "success": False,
                "message": "Error retrieving videos",
                "videos": []
            }
        
        return {
            "success": True,
            "user_id": user_id,
            "count": len(videos),
            "videos": videos
        }
    except Exception as e:
        print(f"Error in get_videos endpoint: {e}")
        return {
            "success": False,
            "message": str(e),
            "videos": []
        }

# Store active video recorders
active_recorders: Dict[str, VideoRecorder] = {}

# WebSocket endpoint for real-time video processing
@app.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time video frame processing"""
    await websocket.accept()
    print("WebSocket connection established")
    
    # Generate unique session ID for this connection
    session_id = str(uuid.uuid4())
    video_recorder = None
    user_id = "anonymous"  # Default value
    
    try:
        data_chunk_count = 0
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
            message_type = message.get("type")
            
            # Handle user authentication message
            if message_type == "auth":
                user_id = message.get("user_id", "anonymous")
                print(f"User authenticated: {user_id} for session {session_id}")
                await websocket.send_json({
                    "type": "auth_success",
                    "session_id": session_id,
                    "message": "Authentication successful"
                })
                continue
            
            if message_type == "video_chunk":
                if video_recorder is None:
                    video_recorder = VideoRecorder(session_id, user_id=user_id, fps=30)
                    active_recorders[session_id] = video_recorder
                    print(f"Started recording for session {session_id}, user {user_id}")

                data_chunk_count += 1

                if data_chunk_count % 5 == 0:
                    feedback_index = (data_chunk_count // 5) % len(feedback_messages)
                    feedback = {
                        "type": "feedback",
                        "message": feedback_messages[feedback_index],
                        "timestamp": data_chunk_count,
                    }
                    await websocket.send_json(feedback)

                    status = {
                        "type": "status",
                        "segments_processed": data_chunk_count,
                        "message": "Recording...",
                    }
                    await websocket.send_json(status)

            elif message_type == "video_complete":
                if video_recorder is None:
                    video_recorder = VideoRecorder(session_id, user_id=user_id, fps=30)
                    active_recorders[session_id] = video_recorder
                    print(f"Started recording for session {session_id}, user {user_id}")

                complete_data = message.get("data", "")
                if complete_data:
                    video_recorder.set_final_webm_blob(complete_data)
                    await websocket.send_json(
                        {
                            "type": "status",
                            "message": "Final video received. Preparing upload…",
                        }
                    )
                else:
                    await websocket.send_json(
                        {
                            "type": "upload_error",
                            "message": "No video data provided",
                        }
                    )

            elif message_type == "frame":
                # Initialize video recorder on first frame
                if video_recorder is None:
                    video_recorder = VideoRecorder(session_id, user_id=user_id, fps=30)
                    active_recorders[session_id] = video_recorder
                    print(f"Started recording for session {session_id}, user {user_id}")
                
                # Add frame to recorder
                frame_data = message.get("data", "")
                video_recorder.add_frame(frame_data)
                
                data_chunk_count += 1
                
                # Here you can process the frame (base64 encoded image)
                # For now, we'll send periodic feedback
                
                # Send feedback every 30 frames (roughly every second at 30fps)
                if data_chunk_count % 30 == 0:
                    feedback_index = (data_chunk_count // 30) % len(feedback_messages)
                    feedback = {
                        "type": "feedback",
                        "message": feedback_messages[feedback_index],
                        "timestamp": data_chunk_count
                    }
                    await websocket.send_json(feedback)
                
                # Send acknowledgment
                if data_chunk_count % 60 == 0:
                    status = {
                        "type": "status",
                        "segments_processed": data_chunk_count,
                        "message": "Processing..."
                    }
                    await websocket.send_json(status)
                    
            elif message_type == "audio":
                print(f"Received audio chunk for session {session_id}")
                # Handle audio chunks
                if video_recorder is None:
                    video_recorder = VideoRecorder(session_id, user_id=user_id, fps=30)
                    active_recorders[session_id] = video_recorder
                    print(f"Started recording for session {session_id}, user {user_id}")
                
                # Add audio chunk to recorder
                audio_data = message.get("data", "")
                video_recorder.add_audio_chunk(audio_data)
                    
            elif message_type == "stop":
                # Handle stop recording request
                print(f"Stop recording request received for session {session_id}")
                
                if video_recorder:
                    await websocket.send_json(
                        {
                            "type": "status",
                            "message": "Processing recording…",
                        }
                    )

                    # Save video to disk
                    video_path = video_recorder.save_video()
                    
                    if video_path:
                        # Upload to Supabase
                        public_url = await upload_to_supabase(video_path, session_id, user_id)
                        
                        if public_url:
                            # Send success response with video URL
                            await websocket.send_json({
                                "type": "upload_complete",
                                "url": public_url,
                                "message": "Video uploaded successfully"
                            })
                        else:
                            await websocket.send_json({
                                "type": "upload_error",
                                "message": "Failed to upload video to Supabase"
                            })
                        
                        # Cleanup temporary file
                        video_recorder.cleanup()
                    else:
                        await websocket.send_json({
                            "type": "upload_error",
                            "message": "Failed to save video"
                        })
                    
                    # Remove from active recorders
                    if session_id in active_recorders:
                        del active_recorders[session_id]
                
                break  # Exit the loop after handling stop
                    
            elif message_type == "ping":
                # Respond to ping messages to keep connection alive
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        print(f"WebSocket connection closed for session {session_id}")
        # Cleanup recorder if connection closed unexpectedly
        if session_id in active_recorders:
            active_recorders[session_id].cleanup()
            del active_recorders[session_id]
    except Exception as e:
        print(f"WebSocket error: {e}")
        # Cleanup recorder on error
        if session_id in active_recorders:
            active_recorders[session_id].cleanup()
            del active_recorders[session_id]
        await websocket.close()

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
