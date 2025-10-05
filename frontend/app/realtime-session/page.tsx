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

export default function WebcamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string>("");
  const [feedbackText, setFeedbackText] = useState(
    "Position yourself in the center"
  );
  const [framesProcessed, setFramesProcessed] = useState(0);

  useEffect(() => {
    return () => {
      // Cleanup: stop all video tracks when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      // Cleanup WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Cleanup frame capture interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket("ws://localhost:8000/ws/video");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError("");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "feedback") {
        setFeedbackText(data.message);
      } else if (data.type === "status") {
        setFramesProcessed(data.frames_processed);
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
    };

    wsRef.current = ws;
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    // Send frame to WebSocket
    wsRef.current.send(
      JSON.stringify({
        type: "frame",
        data: imageData,
      })
    );
  };

  const startFrameCapture = () => {
    // Capture and send frames at ~10 FPS (every 100ms)
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 100);
  };

  const stopFrameCapture = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError("");
        setFeedbackText("Great! You're all set");

        // Connect WebSocket and start frame capture
        connectWebSocket();

        // Wait a bit for video to start playing before capturing frames
        setTimeout(() => {
          startFrameCapture();
        }, 1000);
      }
    } catch (err) {
      setError("Unable to access webcam. Please check permissions.");
      console.error("Error accessing webcam:", err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setFeedbackText("Webcam stopped");

      // Stop frame capture and close WebSocket
      stopFrameCapture();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  };

  const feedbackOptions = [
    { text: "Position yourself in the center", label: "Center Position" },
    { text: "Move closer to the camera", label: "Move Closer" },
    { text: "Perfect! Hold still", label: "Hold Still" },
    { text: "Great! You're all set", label: "All Set" },
  ];

  return (
    <main className='h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 sm:p-6 lg:p-8'>
      <div className='w-full mx-auto'>
        {/* <div className='text-center mb-8'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight'>
            Real-time Session
          </h1>
          <p className='mt-2 text-lg text-muted-foreground'>
            Your personal AI-powered feedback assistant
          </p>
        </div> */}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Video Player Column */}
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

                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className='hidden' />

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
                  <div className='bg-black/60 text-white px-4 py-2 rounded-lg backdrop-blur-sm'>
                    <p className='text-lg font-medium text-center'>
                      {feedbackText}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Controls Column */}
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

                {/* WebSocket Status */}
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

                {/* Frames Processed */}
                {framesProcessed > 0 && (
                  <div className='text-sm text-muted-foreground'>
                    Frames processed: {framesProcessed}
                  </div>
                )}

                {error && (
                  <div className='bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm font-medium'>
                    <p>{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* <Card className='shadow-lg'>
              <CardHeader>
                <CardTitle>Feedback Simulator</CardTitle>
                <CardDescription>
                  Manually trigger feedback messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-2'>
                  {feedbackOptions.map((opt) => (
                    <Button
                      key={opt.label}
                      variant='outline'
                      onClick={() => setFeedbackText(opt.text)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </main>
  );
}
