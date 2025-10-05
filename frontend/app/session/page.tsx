"use client";
import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from "@/components/ui/shadcn-io/video-player";

const subtitles = [
  { timestamp: "0:01", text: "Hello and welcome!" },
  { timestamp: "0:05", text: "In this video, we will be discussing..." },
  { timestamp: "0:12", text: "Let's start with the first point." },
  { timestamp: "0:20", text: "As you can see here..." },
  { timestamp: "0:35", text: "This is very important to understand." },
  { timestamp: "0:45", text: "Another key aspect is..." },
  { timestamp: "0:55", text: "And to conclude..." },
  { timestamp: "1:05", text: "Thank you for watching." },
];

const SessionPage = () => (
  <div className='flex h-screen w-screen items-center justify-center bg-gray-100 dark:bg-gray-900'>
    <div className='flex flex-col w-full max-w-4xl gap-4 p-4'>
      <div className='w-full'>
        <VideoPlayer className='overflow-hidden rounded-lg border'>
          <VideoPlayerContent
            crossOrigin=''
            muted
            preload='auto'
            slot='media'
            src='https://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/high.mp4'
          />
          <VideoPlayerControlBar>
            <VideoPlayerPlayButton />
            <VideoPlayerSeekBackwardButton />
            <VideoPlayerSeekForwardButton />
            <VideoPlayerTimeRange />
            <VideoPlayerTimeDisplay showDuration />
            <VideoPlayerMuteButton />
            <VideoPlayerVolumeRange />
          </VideoPlayerControlBar>
        </VideoPlayer>
      </div>
      <div className='w-full rounded-lg border bg-white p-4 dark:bg-gray-800 max-h-[30vh] overflow-y-auto'>
        <h2 className='mb-4 text-lg font-semibold'>Subtitles</h2>
        <div className='space-y-2'>
          {subtitles.map((subtitle, index) => (
            <div key={index} className='flex gap-2'>
              <span className='font-mono text-sm text-gray-500 dark:text-gray-400'>
                {subtitle.timestamp}
              </span>
              <p className='text-sm'>{subtitle.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SessionPage;
