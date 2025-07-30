// TEMPORARILY DISABLED - Missing dependencies causing build failure
// TODO: Add required dependencies and fix import paths to re-enable

// import { startServerAndCreateNextHandler } from '@as-integrations/next';
// import { ApolloServer } from '@apollo/server';
// import { NextRequest } from 'next/server';
// import { typeDefs } from '@rentitforward/shared/graphql';
// import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

import { NextRequest, NextResponse } from 'next/server';

// Temporary placeholder response
export async function GET() {
  return NextResponse.json({ 
    error: 'GraphQL endpoint temporarily disabled', 
    message: 'GraphQL dependencies need to be installed' 
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({ 
    error: 'GraphQL endpoint temporarily disabled', 
    message: 'GraphQL dependencies need to be installed' 
  }, { status: 503 });
}

// ORIGINAL CODE (COMMENTED OUT):
/*
// Simple resolvers for testing
const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL!',
    __schema: () => ({}), // Enable schema introspection
  },
};

// Simple context for testing
const createContext = async (req: NextRequest) => {
  return {
    req,
    user: null,
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
  };
};

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
  // Enable introspection and debugging for development
  introspection: true,
  includeStacktraceInErrorResponses: true,
});

// Create the request handler
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: createContext,
});

// Export handlers for different HTTP methods
export { handler as GET, handler as POST };
*/ 