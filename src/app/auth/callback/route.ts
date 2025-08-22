import { createClient } from '../../../lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  console.log('Auth callback endpoint called:', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    next,
    fullURL: request.url
  })

  // Handle standard Supabase password reset flow
  if (token_hash && type === 'recovery') {
    try {
      const supabase = await createClient()
      
      console.log('Processing password reset with token_hash:', token_hash.substring(0, 8) + '...')
      
      // Verify the OTP for password recovery
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery'
      })
      
      if (error) {
        console.error('Error verifying OTP for recovery:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error`)
      }

      if (data.session) {
        console.log('Recovery session established successfully:', {
          userId: data.session.user.id
        })

        // Redirect to reset password page with tokens
        const resetUrl = new URL('/reset-password', origin)
        resetUrl.searchParams.set('access_token', data.session.access_token)
        resetUrl.searchParams.set('refresh_token', data.session.refresh_token)
        resetUrl.searchParams.set('type', 'recovery')
        
        console.log('Redirecting to reset password page with tokens')
        return NextResponse.redirect(resetUrl)
      }
    } catch (error) {
      console.error('Exception during recovery verification:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error`)
    }
  }

  // Handle code-based flow (our custom approach)
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

  // If no code or token_hash, redirect to error page
  console.log('No code or token_hash found in callback, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
