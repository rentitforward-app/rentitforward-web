#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envTemplate = `# Supabase Configuration
# Get these values from your Supabase project dashboard at https://supabase.com/dashboard
# Navigate to: Settings > API

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here

# Optional: Service Role Key (only use on server-side, never expose to client)
# This key bypasses Row Level Security (RLS) - use with caution
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-role-key-here

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-secret-key-here

# Optional: For development with local Supabase
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
`;

const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists. Backing up to .env.local.backup');
  fs.copyFileSync(envPath, envPath + '.backup');
}

fs.writeFileSync(envPath, envTemplate);

console.log('✅ Created .env.local file with template values');
console.log('🔧 Please update the following values:');
console.log('   - NEXT_PUBLIC_SUPABASE_URL');
console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   - SUPABASE_SERVICE_ROLE_KEY (optional)');
console.log('   - NEXTAUTH_SECRET');
console.log('');
console.log('📖 See SUPABASE_SETUP.md for detailed instructions'); 