import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Simple test - try to select from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        profilesTableExists: false,
        error: error.message,
        errorCode: error.code,
        hint: error.hint || 'Table likely does not exist'
      });
    }

    return NextResponse.json({ 
      profilesTableExists: true,
      message: 'Profiles table exists and is accessible'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 