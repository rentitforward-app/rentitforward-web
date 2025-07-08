import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch verification documents with user details
    const { data: verificationDocuments, error: docsError } = await supabase
      .from('verification_documents')
      .select(`
        id,
        user_id,
        document_type,
        front_image_url,
        back_image_url,
        verification_status,
        admin_notes,
        uploaded_at,
        reviewed_at,
        reviewed_by,
        profiles!inner (
          id,
          email,
          full_name,
          verification_status,
          stripe_account_id,
          created_at
        )
      `)
      .order('uploaded_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching verification documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch verification documents' }, { status: 500 });
    }

    // Transform data for frontend
    const verificationItems = verificationDocuments?.map(doc => ({
      document: {
        id: doc.id,
        user_id: doc.user_id,
        document_type: doc.document_type,
        front_image_url: doc.front_image_url,
        back_image_url: doc.back_image_url,
        verification_status: doc.verification_status,
        admin_notes: doc.admin_notes,
        uploaded_at: doc.uploaded_at,
        reviewed_at: doc.reviewed_at,
        reviewed_by: doc.reviewed_by,
      },
      user: doc.profiles,
    })) || [];

    return NextResponse.json({ verification_items: verificationItems });
  } catch (error) {
    console.error('Error in admin verification GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, document_id, verification_status, admin_notes } = body;

    if (action === 'review_document') {
      if (!document_id || !verification_status) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Update verification document
      const { data: updatedDoc, error: updateError } = await supabase
        .from('verification_documents')
        .update({
          verification_status,
          admin_notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', document_id)
        .select('user_id')
        .single();

      if (updateError) {
        console.error('Error updating verification document:', updateError);
        return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
      }

      // Update user's overall verification status if approved
      if (verification_status === 'approved' && updatedDoc) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            verification_status: 'verified',
            verification_completed_at: new Date().toISOString(),
          })
          .eq('id', updatedDoc.user_id);

        if (profileUpdateError) {
          console.error('Error updating user verification status:', profileUpdateError);
          // Don't fail the request, just log the error
        }
      }

      // Log the action in audit trail
      const { error: auditError } = await supabase
        .from('verification_audit_log')
        .insert({
          user_id: updatedDoc?.user_id,
          action: `document_${verification_status}`,
          details: {
            document_id,
            admin_notes,
            reviewed_by: user.id,
          },
          created_at: new Date().toISOString(),
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the request, just log the error
      }

      return NextResponse.json({ 
        success: true, 
        message: `Document ${verification_status} successfully` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in admin verification POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 