"use client";

import { useEffect, useState } from "react";
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
import Link from "next/link";

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
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndVideos = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setError("Please log in to view your videos");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch videos from backend
        const response = await fetch(
          `http://localhost:8000/api/videos/${user.id}`
        );
        const data: VideosResponse = await response.json();

        if (data.success && data.videos) {
          setVideos(data.videos);
          if (data.videos.length > 0) {
            setSelectedVideo(data.videos[0]);
          }
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

  if (loading) {
    return (
      <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='mb-8'>
            <Skeleton className='h-10 w-64 mb-2' />
            <Skeleton className='h-6 w-96' />
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2'>
              <Skeleton className='w-full aspect-video rounded-lg' />
            </div>
            <div className='space-y-4'>
              <Skeleton className='h-32 w-full' />
              <Skeleton className='h-32 w-full' />
              <Skeleton className='h-32 w-full' />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
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

        {/* Error State */}
        {error && (
          <Alert variant='destructive' className='mb-6'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
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

        {/* Videos Display */}
        {!error && videos.length > 0 && (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Video Player */}
            <div className='lg:col-span-2'>
              <Card className='overflow-hidden shadow-lg'>
                <CardHeader>
                  <CardTitle>
                    {selectedVideo
                      ? `Session: ${selectedVideo.session_id.slice(0, 8)}...`
                      : "Select a video"}
                  </CardTitle>
                  {selectedVideo && (
                    <CardDescription>
                      Recorded on {formatDate(selectedVideo.created_at)}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className='p-0'>
                  {selectedVideo ? (
                    <div className='relative aspect-video bg-black'>
                      <video
                        key={selectedVideo.url}
                        controls
                        className='w-full h-full'
                        src={selectedVideo.url}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <div className='aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
                      <p className='text-gray-500'>No video selected</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Details */}
              {selectedVideo && (
                <Card className='mt-6'>
                  <CardHeader>
                    <CardTitle>Video Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                      <div>
                        <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                          Session ID
                        </dt>
                        <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono'>
                          {selectedVideo.session_id}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                          File Size
                        </dt>
                        <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                          {formatSize(selectedVideo.size)}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                          Created At
                        </dt>
                        <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                          {formatDate(selectedVideo.created_at)}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-sm font-medium text-gray-500 dark:text-gray-400'>
                          Updated At
                        </dt>
                        <dd className='mt-1 text-sm text-gray-900 dark:text-gray-100'>
                          {formatDate(selectedVideo.updated_at)}
                        </dd>
                      </div>
                    </dl>
                    <div className='mt-6'>
                      <a
                        href={selectedVideo.url}
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
              )}
            </div>

            {/* Video List */}
            <div className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle>All Recordings</CardTitle>
                  <CardDescription>Click to view a recording</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto'>
                  {videos.map((video) => (
                    <Card
                      key={video.session_id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedVideo?.session_id === video.session_id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedVideo(video)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-start space-x-3'>
                          <div className='flex-shrink-0'>
                            <div className='w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden'>
                              <video
                                src={video.url}
                                className='w-full h-full object-cover'
                              />
                            </div>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                              Session {video.session_id.slice(0, 8)}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                              {formatDate(video.created_at)}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                              {formatSize(video.size)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
