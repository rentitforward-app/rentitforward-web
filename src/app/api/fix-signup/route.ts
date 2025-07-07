import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    console.log('Applying profile creation trigger...');
    
    // Create the function that handles new user creation
    const functionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, email)
        VALUES (NEW.id, NEW.email);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { 
      sql: functionSQL 
    });
    
    if (functionError) {
      console.error('Function creation error:', functionError);
      // Try direct execution instead
      const { error: directFunctionError } = await supabase
        .from('any_table_name') // This won't work, but let's try a different approach
        .select();
        
      // Let's use a different approach - create via raw SQL
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
        
      // Since we can't execute DDL directly, let's return instructions
      return NextResponse.json({ 
        success: false,
        message: 'Cannot execute DDL commands via API. Please run this SQL manually in your Supabase dashboard:',
        sql: `
-- Run this in your Supabase SQL Editor:

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        `
      });
    }
    
    // Create the trigger
    const triggerSQL = `
      CREATE OR REPLACE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { 
      sql: triggerSQL 
    });
    
    if (triggerError) {
      console.error('Trigger creation error:', triggerError);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create trigger',
        details: triggerError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Profile creation trigger has been successfully created!'
    });

  } catch (error) {
    console.error('Fix signup failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to apply fix', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 