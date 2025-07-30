import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { NextRequest } from 'next/server';
import { typeDefs } from '@rentitforward/shared/dist/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

// Simple resolvers for testing
const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL!',
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