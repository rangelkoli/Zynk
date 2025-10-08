import os
import cv2
import numpy as np
from PIL import Image
import base64
from io import BytesIO
from datetime import datetime
from typing import List, Optional
from supabase import create_client, Client
from dotenv import load_dotenv
import subprocess
import wave

# Load environment variables
load_dotenv()

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase_bucket = os.getenv("SUPABASE_BUCKET_NAME", "videos")

supabase: Optional[Client] = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)


class VideoRecorder:
    """Handles video and audio recording from WebSocket frames"""
    
    def __init__(self, session_id: str, fps: int = 60):
        self.session_id = session_id
        self.fps = fps
        self.frames: List[np.ndarray] = []
        self.audio_chunks: List[bytes] = []
        self.temp_video_path = f"temp_videos/{session_id}_video.mp4"
        self.temp_audio_path = f"temp_videos/{session_id}_audio.webm"
        self.temp_combined_video_path = f"temp_videos/{session_id}_combined.webm"
        self.final_video_path = f"temp_videos/{session_id}_final.mp4"
        self.has_combined_blob = False
        
        # Audio properties (will be set when first audio chunk arrives)
        self.audio_sample_rate = 48000  # Default for WebM
        self.audio_channels = 1  # Mono
        
        # Create temp directory if it doesn't exist
        os.makedirs("temp_videos", exist_ok=True)
    
    def add_frame(self, base64_frame: str):
        """Add a frame to the recording"""
        try:
            # Remove data URL prefix if present
            if "base64," in base64_frame:
                base64_frame = base64_frame.split("base64,")[1]
            
            # Decode base64 to image
            image_data = base64.b64decode(base64_frame)
            image = Image.open(BytesIO(image_data))
            
            # Convert PIL Image to OpenCV format (BGR)
            frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            self.frames.append(frame)
        except Exception as e:
            print(f"Error adding frame: {e}")
    
    def add_audio_chunk(self, base64_audio: str):
        """Add an audio chunk to the recording"""
        try:
            # Remove data URL prefix if present
            if "base64," in base64_audio:
                base64_audio = base64_audio.split("base64,")[1]
            
            # Decode base64 to audio data
            audio_data = base64.b64decode(base64_audio)
            self.audio_chunks.append(audio_data)
        except Exception as e:
            print(f"Error adding audio chunk: {e}")

    def set_final_webm_blob(self, base64_blob: str):
        """Store the complete WebM blob received at the end of the session"""
        try:
            if "base64," in base64_blob:
                base64_blob = base64_blob.split("base64,")[1]

            blob_data = base64.b64decode(base64_blob)
            with open(self.temp_combined_video_path, "wb") as f:
                f.write(blob_data)

            self.has_combined_blob = True
            print(f"Stored final WebM blob for session {self.session_id}")
        except Exception as e:
            print(f"Error storing WebM blob: {e}")
            self.has_combined_blob = False
    
    def save_video(self) -> Optional[str]:
        """Save recorded frames and audio as a video file"""
        if self.has_combined_blob:
            try:
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-fflags",
                    "+genpts",
                    "-i",
                    self.temp_combined_video_path,
                    "-vsync",
                    "2",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-r",
                    str(self.fps),
                    "-pix_fmt",
                    "yuv420p",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "160k",
                    "-ar",
                    str(self.audio_sample_rate),
                    "-ac",
                    str(self.audio_channels),
                    "-af",
                    "aresample=async=1:first_pts=0",
                    "-movflags",
                    "+faststart",
                    "-shortest",
                    self.final_video_path,
                ]

                subprocess.run(
                    ffmpeg_cmd,
                    check=True,
                    capture_output=True,
                    text=True,
                )
                print(f"Converted WebM blob to MP4: {self.final_video_path}")
                return self.final_video_path
            except subprocess.CalledProcessError as e:
                print(f"FFmpeg conversion error: {e.stderr}")
                print("Falling back to raw WebM upload")
                return self.temp_combined_video_path
            except FileNotFoundError:
                print("FFmpeg not found. Returning WebM recording.")
                print("Install FFmpeg: brew install ffmpeg (on macOS)")
                return self.temp_combined_video_path
            except Exception as e:
                print(f"Error converting WebM blob: {e}")
                return None

        if not self.frames:
            print("No frames to save")
            return None
        
        try:
            # Save video frames
            height, width, _ = self.frames[0].shape
            
            # Use H.264 codec for better compatibility
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            video_writer = cv2.VideoWriter(
                self.temp_video_path,
                fourcc,
                self.fps,
                (width, height)
            )
            
            # Write all frames
            for frame in self.frames:
                video_writer.write(frame)
            
            video_writer.release()
            print(f"Video frames saved to {self.temp_video_path}")
            
            # If we have audio chunks, save them and combine with video
            if self.audio_chunks:
                # Save audio chunks to file
                with open(self.temp_audio_path, 'wb') as f:
                    for chunk in self.audio_chunks:
                        f.write(chunk)
                print(f"Audio saved to {self.temp_audio_path}")
                
                # Combine video and audio using FFmpeg
                try:
                    subprocess.run([
                        'ffmpeg',
                        '-i', self.temp_video_path,
                        '-i', self.temp_audio_path,
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        '-y',
                        self.final_video_path
                    ], check=True, capture_output=True, text=True)
                    print(f"Combined video with audio: {self.final_video_path}")
                    return self.final_video_path
                except subprocess.CalledProcessError as e:
                    print(f"FFmpeg error: {e.stderr}")
                    print("Returning video without audio")
                    return self.temp_video_path
                except FileNotFoundError:
                    print("FFmpeg not found. Returning video without audio.")
                    print("Install FFmpeg: brew install ffmpeg (on macOS)")
                    return self.temp_video_path
            else:
                # No audio, return video only
                return self.temp_video_path
                
        except Exception as e:
            print(f"Error saving video: {e}")
            return None
    
    def cleanup(self):
        """Clean up temporary files"""
        try:
            if os.path.exists(self.temp_video_path):
                os.remove(self.temp_video_path)
                print(f"Cleaned up {self.temp_video_path}")
            if os.path.exists(self.temp_audio_path):
                os.remove(self.temp_audio_path)
                print(f"Cleaned up {self.temp_audio_path}")
            if os.path.exists(self.temp_combined_video_path):
                os.remove(self.temp_combined_video_path)
                print(f"Cleaned up {self.temp_combined_video_path}")
            if os.path.exists(self.final_video_path):
                os.remove(self.final_video_path)
                print(f"Cleaned up {self.final_video_path}")
        except Exception as e:
            print(f"Error cleaning up: {e}")


async def upload_to_supabase(video_path: str, session_id: str) -> Optional[str]:
    """Upload video to Supabase storage"""
    if not supabase:
        print("Supabase client not initialized")
        return None
    
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"session_{session_id}_{timestamp}.mp4"
        
        # Read video file
        with open(video_path, "rb") as f:
            video_data = f.read()
        
        # Upload to Supabase storage
        response = supabase.storage.from_(supabase_bucket).upload(
            filename,
            video_data,
            file_options={"content-type": "video/mp4"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_(supabase_bucket).get_public_url(filename)
        
        print(f"Video uploaded to Supabase: {public_url}")
        return public_url
    except Exception as e:
        print(f"Error uploading to Supabase: {e}")
        return None
