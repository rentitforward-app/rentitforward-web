import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  // Check if we're in a build environment
  const isBuildTime = typeof window === 'undefined' && process.env.NODE_ENV === 'production'
  
  // Use fallback values during build time to prevent Invalid URL errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder'

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.warn('Invalid Supabase URL, using fallback:', supabaseUrl)
    return createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder',
      {
        cookies: {
          get() { return undefined; },
          set() { },
          remove() { },
        },
      }
    )
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined;
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return undefined;
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return;
          let cookieString = `${name}=${value}`;
          if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
          if (options?.path) cookieString += `; path=${options.path}`;
          if (options?.domain) cookieString += `; domain=${options.domain}`;
          if (options?.secure) cookieString += '; secure';
          if (options?.httpOnly) cookieString += '; httponly';
          if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
          document.cookie = cookieString;
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return;
          this.set(name, '', { ...options, maxAge: 0 });
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'rentitforward-web',
        },
      },
    }
  )
} 