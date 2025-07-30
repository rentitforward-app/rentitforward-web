import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDataLoaders, DataLoaders } from './dataloaders';

export interface GraphQLContext {
  req: NextRequest;
  user: User | null;
  supabase: SupabaseClient;
  dataloaders: DataLoaders;
  ip: string;
  userAgent: string;
  isAdmin: boolean;
}

export async function createContext({ req }: { req: NextRequest }): Promise<GraphQLContext> {
  // Create Supabase client for server-side operations
  // For now, use the service role client for server-side operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get authenticated user
  let user: User | null = null;
  let isAdmin = false;

  try {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    if (!error && authUser) {
      user = authUser;
      
      // Check if user is admin by querying the profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      isAdmin = profile?.role === 'admin';
    }
  } catch (error) {
    console.error('Error getting user in GraphQL context:', error);
  }

  // Extract client information
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create DataLoaders for this request
  const dataloaders = createDataLoaders(supabase);

  return {
    req,
    user,
    supabase,
    dataloaders,
    ip,
    userAgent,
    isAdmin,
  };
}

// Helper functions for authorization
export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

export function requireAdmin(context: GraphQLContext): User {
  const user = requireAuth(context);
  if (!context.isAdmin) {
    throw new Error('Admin access required');
  }
  return user;
}

export function requireOwnership(context: GraphQLContext, resourceOwnerId: string): User {
  const user = requireAuth(context);
  if (user.id !== resourceOwnerId && !context.isAdmin) {
    throw new Error('Insufficient permissions');
  }
  return user;
} 