# Supabase Setup Guide

## Overview
This project uses Supabase for backend services including authentication, database, and storage.

## Quick Start

### 1. Environment Variables
Copy the `env.template` file to `.env.local` and fill in your Supabase project details:

```bash
cp env.template .env.local
```

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for server-side operations)

### 2. Supabase Project Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Get your project URL and API keys from Settings > API
4. Update your `.env.local` file with these values

### 3. Database Schema

The project includes TypeScript types in `src/lib/supabase/types.ts`. Update this file to match your database schema.

To generate types automatically:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
```

### 4. Authentication

The project includes:
- **Middleware**: Handles authentication for protected routes
- **Auth utilities**: Helper functions for sign in/out
- **React hook**: `useAuth()` for client-side auth state

#### Protected Routes
By default, all routes except `/login` and `/auth/*` require authentication. Modify the middleware in `src/middleware.ts` to change this behavior.

#### Sign In/Out
```typescript
import { signInWithEmail, signOut } from '@/lib/auth/utils'

// Sign in
await signInWithEmail('user@example.com', 'password')

// Sign out
await signOut()
```

#### Using the Auth Hook
```typescript
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { user, loading, isAuthenticated } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please sign in</div>
  
  return <div>Welcome, {user.email}!</div>
}
```

## File Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # Browser client
│   │   ├── server.ts      # Server client
│   │   ├── types.ts       # Database types
│   │   └── index.ts       # Exports
│   └── auth/
│       └── utils.ts       # Auth utilities
├── hooks/
│   └── use-auth.ts        # Auth React hook
└── middleware.ts          # Auth middleware
```

## Commands

### Development
```bash
npm run dev
```

### Supabase CLI
```bash
# Initialize Supabase (if starting fresh)
npx supabase init

# Start local development
npx supabase start

# Generate types
npx supabase gen types typescript --local > src/lib/supabase/types.ts

# Reset database
npx supabase db reset
```

## Best Practices

1. **Server vs Client**: Use server client for server components and API routes, browser client for client components
2. **Type Safety**: Keep your types updated with your database schema
3. **Authentication**: Use the provided auth utilities and hooks for consistent behavior
4. **Error Handling**: Always handle errors from Supabase operations

## Troubleshooting

### Common Issues

1. **Auth not working**: Check your environment variables and middleware configuration
2. **Types errors**: Regenerate types after schema changes
3. **CORS issues**: Ensure your domain is added to Supabase authentication settings

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- Check the console for detailed error messages 