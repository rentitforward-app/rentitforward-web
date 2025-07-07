import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test basic connection with a simple query
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Supabase session error:', sessionError);
      return NextResponse.json({ 
        error: 'Supabase session check failed', 
        details: sessionError.message 
      }, { status: 500 });
    }

    // Test signup functionality (with a test email)
    const testEmail = `test-${Date.now()}@example.com`;
    console.log('Testing signup with email:', testEmail);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });

    console.log('Signup test result:', { signUpData, signUpError });

    if (signUpError) {
      console.error('Signup test error:', signUpError);
      return NextResponse.json({ 
        connection: 'OK',
        signup: 'FAILED',
        error: signUpError.message,
        code: signUpError.status,
        details: signUpError
      }, { status: 200 });
    }

    return NextResponse.json({ 
      connection: 'OK',
      signup: 'OK',
      message: 'Supabase is working correctly',
      userCreated: !!signUpData.user,
      confirmationSent: !signUpData.user?.email_confirmed_at
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 