"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";

export default function WebcamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState(
    "Position yourself in the center"
  );
  const [isAIFeedback, setIsAIFeedback] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch user ID on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        console.log("User ID:", user.id);
      } else {
        setUserId("anonymous");
        console.log("No authenticated user, using anonymous");
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8000/ws/video");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError("");

      // Send user authentication immediately after connection
      if (userId) {
        ws.send(
          JSON.stringify({
            type: "auth",
            user_id: userId,
          })
        );
        console.log("Sent user_id to backend:", userId);
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "auth_success") {
        console.log("Authentication successful:", data.session_id);
      } else if (data.type === "ai_feedback") {
        // Handle AI feedback from the feedback agent
        console.log("AI Feedback received:", data.message);
        if (data.message !== "OK") {
          setFeedbackText(data.message);
          setIsAIFeedback(true);
          // Clear AI feedback flag after 4 seconds
          setTimeout(() => setIsAIFeedback(false), 4000);
        }
      } else if (data.type === "feedback") {
        setFeedbackText(data.message);
        setIsAIFeedback(false);
      } else if (data.type === "status") {
        const processed =
          data.segments_processed ?? data.frames_processed ?? data.timestamp;
        setFeedbackText(
          processed
            ? `Recording in progress… (${processed} segments captured)`
            : "Recording in progress…"
        );
        setIsAIFeedback(false);
      } else if (data.type === "upload_complete") {
        setFeedbackText(`Video uploaded successfully! URL: ${data.url}`);
        setIsAIFeedback(false);
        console.log("Video URL:", data.url);
        ws.close();
        wsRef.current = null;
      } else if (data.type === "upload_error") {
        setFeedbackText(`Error: ${data.message}`);
        setIsAIFeedback(false);
        setError(data.message);
        ws.close();
        wsRef.current = null;
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket connection error");
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      wsRef.current = null;
    };

    wsRef.current = ws;
  };

  const startMediaRecording = (stream: MediaStream) => {
    const mimeType = "video/webm;codecs=vp8,opus";

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.error("MIME type not supported");
      setError("Browser doesn't support required video format");
      return;
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });

    videoChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Always accumulate chunks for final video
        videoChunksRef.current.push(event.data);
        console.log(
          `Chunk received: ${event.data.size} bytes, total chunks: ${videoChunksRef.current.length}`
        );

        // Also send chunk to server (for real-time processing if needed)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            wsRef.current?.send(
              JSON.stringify({
                type: "video_chunk",
                data: base64Data,
              })
            );
          };
          reader.readAsDataURL(event.data);
        }
      }
    };

    mediaRecorder.onstop = () => {
      const recordedChunks = videoChunksRef.current;
      videoChunksRef.current = [];

      console.log(
        `MediaRecorder stopped. Total chunks: ${recordedChunks.length}`
      );

      if (!recordedChunks.length) {
        console.log("No recorded chunks, sending stop without video");
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "stop",
            })
          );
        }
        mediaRecorderRef.current = null;
        return;
      }

      const blob = new Blob(recordedChunks, { type: mimeType });
      console.log(
        `Creating final blob: ${blob.size} bytes from ${recordedChunks.length} chunks`
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        console.log(`Sending complete video: ${base64Data.length} chars`);

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "video_complete",
              data: base64Data,
            })
          );

          wsRef.current.send(
            JSON.stringify({
              type: "stop",
            })
          );
        } else {
          console.error("WebSocket not open, cannot send video");
        }
      };

      reader.readAsDataURL(blob);
      mediaRecorderRef.current = null;
    };

    mediaRecorder.start(1000); // Send chunks every second
    mediaRecorderRef.current = mediaRecorder;

    // Capture frames for AI analysis every second
    startFrameCapture();
  };

  const startFrameCapture = () => {
    // Capture and send a frame every second for AI analysis
    frameIntervalRef.current = setInterval(() => {
      if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx && canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(videoRef.current, 0, 0);
          const base64Frame = canvas.toDataURL("image/jpeg", 0.7);

          console.log(
            `Sending frame: ${canvas.width}x${canvas.height}, size: ${base64Frame.length} chars`
          );

          // Send frame for AI analysis
          wsRef.current.send(
            JSON.stringify({
              type: "frame",
              data: base64Frame,
            })
          );
        } else {
          console.log("Canvas not ready yet:", canvas.width, canvas.height);
        }
      }
    }, 1000); // Send one frame per second
  };

  const startWebcam = async () => {
    try {
      // Ensure we have a user ID before starting
      if (!userId) {
        setError("User authentication required. Please wait...");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError("");
        setFeedbackText("Great! You're all set");

        connectWebSocket();

        setTimeout(() => {
          startMediaRecording(stream);
        }, 1000);
      }
    } catch (err) {
      setError("Unable to access webcam/microphone. Please check permissions.");
      console.error("Error accessing media devices:", err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setFeedbackText("Processing and uploading video...");

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    }
  };

  return (
    <main className='h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 sm:p-6 lg:p-8'>
      <div className='w-full mx-auto'>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <Card className='overflow-hidden shadow-lg'>
              <div className='relative aspect-video bg-muted rounded-t-lg'>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className='w-full h-full object-cover'
                />

                {!isStreaming && (
                  <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                    <div className='text-center space-y-2 text-white'>
                      <div className='w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center'>
                        <svg
                          className='w-8 h-8'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                          />
                        </svg>
                      </div>
                      <p className='font-semibold'>Webcam not active</p>
                    </div>
                  </div>
                )}

                <div className='absolute inset-x-0 bottom-0 flex items-end justify-center pb-4 pointer-events-none'>
                  <div
                    className={`px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-300 ${
                      isAIFeedback
                        ? "bg-amber-800 text-white border-2 border-white/30 shadow-lg"
                        : "bg-black/60 text-white"
                    }`}
                  >
                    {isAIFeedback && (
                      <div className='flex items-center gap-2 mb-1'>
                        <svg
                          className='w-4 h-4'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path d='M13 7H7v6h6V7z' />
                          <path
                            fillRule='evenodd'
                            d='M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z'
                            clipRule='evenodd'
                          />
                        </svg>
                        <span className='text-xs font-semibold'>AI Coach</span>
                      </div>
                    )}
                    <p className='text-lg font-medium text-center'>
                      {feedbackText}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className='space-y-6'>
            <Card className='shadow-lg'>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
                <CardDescription>Start or stop your webcam</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex flex-col space-y-2'>
                  {!isStreaming ? (
                    <Button onClick={startWebcam} size='lg'>
                      Start Webcam
                    </Button>
                  ) : (
                    <Button
                      onClick={stopWebcam}
                      variant='destructive'
                      size='lg'
                    >
                      Stop Webcam
                    </Button>
                  )}
                </div>

                <div className='flex items-center space-x-2 text-sm'>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className='text-muted-foreground'>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                {error && (
                  <div className='bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm font-medium'>
                    <p>{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
