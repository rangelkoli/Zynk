"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Video {
  session_id: string;
  url: string;
  created_at: string;
  updated_at: string;
  size: number;
  name: string;
}

interface FeedbackSegment {
  id: string;
  session_id: string;
  user_id: string;
  feedback_text: string;
  start_seconds: number;
  end_seconds: number;
  created_at: string;
}

interface VideosResponse {
  success: boolean;
  user_id?: string;
  count?: number;
  videos?: Video[];
  message?: string;
}

interface FeedbackResponse {
  success: boolean;
  session_id?: string;
  count?: number;
  feedback?: FeedbackSegment[];
  message?: string;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchVideoAndFeedback = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Please log in to view this video");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch all videos to find the one matching sessionId
        const videoResponse = await fetch(
          `http://localhost:8000/api/videos/${user.id}`
        );
        const videoData: VideosResponse = await videoResponse.json();

        if (videoData.success && videoData.videos) {
          const foundVideo = videoData.videos.find(
            (v) => v.session_id === sessionId
          );
          if (foundVideo) {
            setVideo(foundVideo);
          } else {
            setError("Video not found");
          }
        } else {
          setError(videoData.message || "Failed to fetch video");
        }

        // Fetch feedback for this session
        const feedbackResponse = await fetch(
          `http://localhost:8000/api/feedback/${sessionId}`
        );
        const feedbackData: FeedbackResponse = await feedbackResponse.json();

        if (feedbackData.success && feedbackData.feedback) {
          setFeedback(feedbackData.feedback);
        }
      } catch (err) {
        console.error("Error fetching video and feedback:", err);
        setError("An error occurred while loading the video");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchVideoAndFeedback();
    }
  }, [sessionId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-7xl mx-auto'>
          <Skeleton className='h-8 w-32 mb-6' />
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2 space-y-6'>
              <Skeleton className='w-full aspect-video rounded-lg' />
              <Skeleton className='h-64 w-full' />
            </div>
            <div className='space-y-4'>
              <Skeleton className='h-96 w-full' />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !video) {
    return (
      <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-7xl mx-auto'>
          <Link href='/videos'>
            <Button variant='ghost' className='mb-6'>
              ← Back to Videos
            </Button>
          </Link>
          <Alert variant='destructive'>
            <AlertDescription>{error || "Video not found"}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Back Button */}
        <Link href='/videos'>
          <Button variant='ghost' className='mb-6'>
            ← Back to Videos
          </Button>
        </Link>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Video Player and Details */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Video Player */}
            <Card className='overflow-hidden shadow-lg'>
              <CardHeader>
                <CardTitle>
                  Session: {video.session_id.slice(0, 8)}...
                </CardTitle>
                <CardDescription>
                  Recorded on {formatDate(video.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                <div className='relative aspect-video bg-black'>
                  <video
                    key={video.url}
                    controls
                    className='w-full h-full'
                    src={video.url}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </CardContent>
            </Card>

            {/* Video Details */}
            <Card>
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div>
                    <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Session ID
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono break-all'>
                      {video.session_id}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      File Size
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                      {formatSize(video.size)}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Created At
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                      {formatDate(video.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                      Updated At
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                      {formatDate(video.updated_at)}
                    </dd>
                  </div>
                </dl>
                <div className='mt-6'>
                  <a
                    href={video.url}
                    download
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <Button variant='outline' className='w-full'>
                      Download Video
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Feedback Summary */}
          <div className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>AI Feedback Summary</CardTitle>
                <CardDescription>
                  {feedback.length > 0
                    ? `${feedback.length} feedback segment${
                        feedback.length > 1 ? "s" : ""
                      }`
                    : "No feedback available"}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto'>
                {feedback.length === 0 ? (
                  <div className='text-center py-8'>
                    <svg
                      className='mx-auto h-12 w-12 text-gray-400'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                      />
                    </svg>
                    <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                      No AI feedback was recorded for this session
                    </p>
                  </div>
                ) : (
                  feedback.map((segment, index) => (
                    <Card
                      key={segment.id || index}
                      className='bg-gray-50 dark:bg-gray-900'
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start justify-between mb-2'>
                          <Badge variant='secondary' className='text-xs'>
                            {formatTime(segment.start_seconds)} -{" "}
                            {formatTime(segment.end_seconds)}
                          </Badge>
                        </div>
                        <p className='text-sm text-gray-700 dark:text-gray-300'>
                          {segment.feedback_text}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
