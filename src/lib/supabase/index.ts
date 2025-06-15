// Export clients
export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient } from './server'

// Export types
export type * from './types'

// Re-export common types from supabase-js
export type { User, Session } from '@supabase/supabase-js' 