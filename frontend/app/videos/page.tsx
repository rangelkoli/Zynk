"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Video {
  session_id: string;
  url: string;
  created_at: string;
  updated_at: string;
  size: number;
  name: string;
}

interface VideosResponse {
  success: boolean;
  user_id?: string;
  count?: number;
  videos?: Video[];
  message?: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndVideos = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Please log in to view your videos");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const response = await fetch(
          `http://localhost:8000/api/videos/${user.id}`
        );
        const data: VideosResponse = await response.json();

        if (data.success && data.videos) {
          setVideos(data.videos);
        } else {
          setError(data.message || "Failed to fetch videos");
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError("An error occurred while fetching videos");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndVideos();
  }, []);

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

  const handleVideoClick = (sessionId: string) => {
    router.push(`/videos/${sessionId}`);
  };

  if (loading) {
    return (
      <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-8'>
            <Skeleton className='h-10 w-64 mb-2' />
            <Skeleton className='h-6 w-96' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            <Skeleton className='h-64 w-full' />
            <Skeleton className='h-64 w-full' />
            <Skeleton className='h-64 w-full' />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                My Videos
              </h1>
              <p className='text-gray-600 dark:text-gray-400 mt-2'>
                {videos.length > 0
                  ? `${videos.length} recorded session${
                      videos.length > 1 ? "s" : ""
                    }`
                  : "No videos yet"}
              </p>
            </div>
            <Link href='/realtime-session'>
              <Button>Record New Video</Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant='destructive' className='mb-6'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && videos.length === 0 && (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-16'>
              <svg
                className='w-24 h-24 text-gray-400 mb-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2'>
                No videos recorded yet
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6'>
                Start recording to see your videos here
              </p>
              <Link href='/realtime-session'>
                <Button>Record Your First Video</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!error && videos.length > 0 && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {videos.map((video) => (
              <Card
                key={video.session_id}
                className='cursor-pointer transition-all hover:shadow-lg hover:scale-105'
                onClick={() => handleVideoClick(video.session_id)}
              >
                <CardContent className='p-0'>
                  <div className='relative aspect-video bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden'>
                    <video
                      src={video.url}
                      className='w-full h-full object-cover pointer-events-none'
                      preload='metadata'
                      muted
                    />
                    <div className='absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center'>
                      <svg
                        className='w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity'
                        fill='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path d='M8 5v14l11-7z' />
                      </svg>
                    </div>
                  </div>

                  <div className='p-4'>
                    <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate'>
                      Session {video.session_id.slice(0, 8)}...
                    </h3>
                    <div className='space-y-1 text-sm text-gray-600 dark:text-gray-400'>
                      <p>{formatDate(video.created_at)}</p>
                      <p>{formatSize(video.size)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
