import { createClient } from '../../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  console.log('Auth callback endpoint called:', {
    hasCode: !!code,
    type,
    next,
    fullURL: request.url
  })

  if (code) {
    try {
      const supabase = await createClient()
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }

      if (data.session) {
        console.log('Session established successfully:', {
          userId: data.session.user.id,
          type: type
        })

        // For password reset, redirect to the reset password page with tokens
        if (type === 'recovery') {
          const resetUrl = new URL('/reset-password', origin)
          resetUrl.searchParams.set('access_token', data.session.access_token)
          resetUrl.searchParams.set('refresh_token', data.session.refresh_token)
          resetUrl.searchParams.set('type', 'recovery')
          
          console.log('Redirecting to reset password page with tokens')
          return NextResponse.redirect(resetUrl)
        }

        // For other auth flows, redirect to the next page
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('Exception during auth callback:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // If no code or other error, redirect to error page
  console.log('No code found in callback, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
