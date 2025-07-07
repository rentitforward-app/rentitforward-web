import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test if we can query the database
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Database query error:', tablesError);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: tablesError.message 
      }, { status: 500 });
    }

    // Check for common tables
    const tableNames = tablesData?.map(t => t.table_name) || [];
    
    // Test if we can query users/profiles table specifically
    let profilesTest = null;
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      profilesTest = {
        exists: !profilesError,
        error: profilesError?.message || null,
        canQuery: !!profilesData
      };
    } catch (error) {
      profilesTest = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({ 
      database: 'OK',
      tables: tableNames,
      profilesTable: profilesTest,
      message: 'Database connection working'
    });

  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ 
      error: 'Database test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 