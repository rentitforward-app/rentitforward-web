import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get environment variables (only public ones)
    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      currentOrigin: request.headers.get('origin') || 'unknown',
      protocol: request.headers.get('x-forwarded-proto') || 'http',
    };
    
    // Test Supabase connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const debugInfo = {
      config,
      session: {
        hasSession: !!session,
        error: sessionError?.message,
        userId: session?.user?.id,
        sessionType: session?.user?.app_metadata,
      },
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const supabase = await createClient();
    
    // Determine the correct base URL for the redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
    const redirectUrl = `${baseUrl}/reset-password`;
    
    console.log('API Password reset configuration:', {
      email,
      redirectUrl,
      baseUrl,
    });
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
      redirectUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


