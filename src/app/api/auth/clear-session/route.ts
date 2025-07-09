import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  try {
    // Sign out to clear the invalid session
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error clearing session:', error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Session cleared successfully' 
    });
  } catch (error) {
    console.error('Error in clear session:', error);
    return NextResponse.json({ 
      error: 'Failed to clear session' 
    }, { status: 500 });
  }
} 