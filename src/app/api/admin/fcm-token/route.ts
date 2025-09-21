import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fcmService } from '@/lib/notifications/fcm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { token, platform } = await request.json();
    
    if (!token || !platform) {
      return NextResponse.json({ error: 'Token and platform are required' }, { status: 400 });
    }

    if (!['web', 'ios', 'android'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // Register the FCM token
    const result = await fcmService.registerAdminToken(user.id, token, platform);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'FCM token registered successfully' 
    });

  } catch (error) {
    console.error('Error registering FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Deactivate the FCM token
    const { error } = await supabase
      .from('fcm_subscriptions')
      .update({ is_active: false })
      .eq('fcm_token', token)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deactivating FCM token:', error);
      return NextResponse.json({ error: 'Failed to deactivate token' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'FCM token deactivated successfully' 
    });

  } catch (error) {
    console.error('Error deactivating FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
