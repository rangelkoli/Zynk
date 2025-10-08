"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='max-w-md w-full space-y-4 p-6'>
        <h1 className='text-2xl font-bold text-red-600'>Error</h1>
        <p className='text-gray-600'>
          {message || "An unexpected error occurred. Please try again."}
        </p>
        <Link
          href='/'
          className='inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
