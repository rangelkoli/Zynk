"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
// Simple logo component for the navbar
const Logo = (props: React.SVGAttributes<SVGElement>) => {
  return (
    <svg
      width='1em'
      height='1em'
      viewBox='0 0 324 323'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <rect
        x='88.1023'
        y='144.792'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 88.1023 144.792)'
        fill='currentColor'
      />
      <rect
        x='85.3459'
        y='244.537'
        width='151.802'
        height='36.5788'
        rx='18.2894'
        transform='rotate(-38.5799 85.3459 244.537)'
        fill='currentColor'
      />
    </svg>
  );
};
// Hamburger icon component
const HamburgerIcon = ({
  className,
  ...props
}: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn("pointer-events-none", className)}
    width={16}
    height={16}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M4 12L20 12'
      className='origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]'
    />
    <path
      d='M4 12H20'
      className='origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45'
    />
    <path
      d='M4 12H20'
      className='origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]'
    />
  </svg>
);
// Types
export interface Navbar01NavLink {
  href: string;
  label: string;
  active?: boolean;
}
export interface Navbar01Props extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: Navbar01NavLink[];
  signInText?: string;
  signInHref?: string;
  ctaText?: string;
  ctaHref?: string;
  onSignInClick?: () => void;
  onCtaClick?: () => void;
}
// Default navigation links
const defaultNavigationLinks: Navbar01NavLink[] = [
  { href: "/", label: "Home", active: true },
  { href: "/realtime-session", label: "Record" },
  { href: "/videos", label: "My Videos" },
  { href: "#about", label: "About" },
];
export const Navbar01 = React.forwardRef<HTMLElement, Navbar01Props>(
  (
    {
      className,
      logo = <Logo />,
      logoHref = "/",
      navigationLinks = defaultNavigationLinks,
      signInText = "Sign In",
      signInHref = "/login",
      ctaText = "Get Started",
      ctaHref = "/signup",
      onSignInClick,
      onCtaClick,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const [user, setUser] = useState<any>(null);
    const containerRef = useRef<HTMLElement>(null);
    const supabase = createClient();

    useEffect(() => {
      const fetchUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      };

      fetchUser();

      // Subscribe to auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }, []);

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };
      checkWidth();
      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }
      return () => {
        resizeObserver.disconnect();
      };
    }, []);
    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        containerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );
    return (
      <header
        ref={combinedRef}
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 [&_*]:no-underline",
          className
        )}
        {...props}
      >
        <div className='container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4'>
          {/* Left side */}
          <div className='flex items-center gap-2'>
            {/* Mobile menu trigger */}
            {isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className='group h-9 w-9 hover:bg-accent hover:text-accent-foreground'
                    variant='ghost'
                    size='icon'
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align='start' className='w-48 p-2'>
                  <NavigationMenu className='max-w-none'>
                    <NavigationMenuList className='flex-col items-start gap-1'>
                      {navigationLinks.map((link, index) => (
                        <NavigationMenuItem key={index} className='w-full'>
                          <Link href={link.href}>
                            <div
                              className={cn(
                                "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer no-underline",
                                link.active
                                  ? "bg-accent text-accent-foreground"
                                  : "text-foreground/80"
                              )}
                            >
                              {link.label}
                            </div>
                          </Link>
                        </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            )}
            {/* Main nav */}
            <div className='flex items-center gap-6'>
              <Link href={logoHref}>
                <div className='flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors cursor-pointer'>
                  <div className='text-2xl'>{logo}</div>
                  <span className='hidden font-bold text-xl sm:inline-block'>
                    Zynk
                  </span>
                </div>
              </Link>
              {/* Navigation menu */}
              {!isMobile && (
                <NavigationMenu className='flex'>
                  <NavigationMenuList className='gap-1'>
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index}>
                        <Link href={link.href}>
                          <div
                            className={cn(
                              "group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer no-underline",
                              link.active
                                ? "bg-accent text-accent-foreground"
                                : "text-foreground/80 hover:text-foreground"
                            )}
                          >
                            {link.label}
                          </div>
                        </Link>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          {/* Right side */}
          <div className='flex items-center gap-3'>
            <ThemeToggle />
            {!user ? (
              <>
                <Link href='/login'>
                  <Button
                    variant='ghost'
                    className='rounded-full px-4 sm:px-5 font-medium h-10 text-sm sm:h-12 sm:text-base'
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href='/signup'>
                  <Button className='rounded-full bg-[#6c47ff] hover:bg-[#5a38e6] px-4 sm:px-5 font-medium text-white h-10 text-sm sm:h-12 sm:text-base'>
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <div className='flex items-center gap-2'>
                <span className='text-sm hidden sm:inline'>{user.email}</span>
                <form action='/auth/signout' method='post'>
                  <Button
                    variant='ghost'
                    type='submit'
                    className='rounded-full px-4 sm:px-5 font-medium h-10 text-sm sm:h-12 sm:text-base'
                  >
                    Sign Out
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }
);
Navbar01.displayName = "Navbar01";
export { Logo, HamburgerIcon };
