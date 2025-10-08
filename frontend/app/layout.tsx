import { type Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeakFlow",
  description: "Your personal AI-powered feedback assistant",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <header className='fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 p-4 border-b h-16 bg-background'>
            <div className='font-bold text-lg'>Zynk</div>
            <div className='flex items-center gap-4'>
              <ThemeToggle />
              {!user ? (
                <>
                  <Link href='/login'>
                    <button className='cursor-pointer rounded-full px-4 sm:px-5 font-medium h-10 text-sm sm:h-12 sm:text-base'>
                      Sign In
                    </button>
                  </Link>
                  <Link href='/signup'>
                    <button className='cursor-pointer rounded-full bg-[#6c47ff] px-4 sm:px-5 font-medium text-white h-10 text-sm sm:h-12 sm:text-base'>
                      Sign Up
                    </button>
                  </Link>
                </>
              ) : (
                <div className='flex items-center gap-2'>
                  <span className='text-sm'>{user.email}</span>
                  <form action='/auth/signout' method='post'>
                    <button className='cursor-pointer rounded-full px-4 sm:px-5 font-medium h-10 text-sm sm:h-12 sm:text-base'>
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </header>
          <main className='pt-16'>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
