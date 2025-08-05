import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Auth callback:', { code: code ? 'present' : 'missing', next, origin })

  if (code) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              request.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: any) {
              request.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        // Add specific error handling for different error types
        if (error.message.includes('expired')) {
          return NextResponse.redirect(new URL('/auth/auth-code-error?error=expired', origin))
        } else if (error.message.includes('invalid')) {
          return NextResponse.redirect(new URL('/auth/auth-code-error?error=invalid', origin))
        }
        return NextResponse.redirect(new URL('/auth/auth-code-error?error=unknown', origin))
      }

      if (data.session) {
        console.log('Auth callback success - session created')
        console.log('Session details:', {
          user: data.session.user?.id,
          expires_at: data.session.expires_at,
          type: data.session.user?.app_metadata
        })
        console.log('Redirecting to:', next)
        
        // Create response with proper cookie handling for password reset
        const response = NextResponse.redirect(new URL(next, origin))
        return response
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(new URL('/auth/auth-code-error?error=exception', origin))
    }
  } else {
    console.log('Auth callback: no code parameter found')
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error?error=no-code', origin))
} 