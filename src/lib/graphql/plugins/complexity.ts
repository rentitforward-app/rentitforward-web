import { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';

// Simple complexity plugin for basic query depth limiting
export const complexityPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ request, document }: any) {
        try {
          // Simple depth checking instead of complex analysis
          const operation = document.definitions.find(
            (def: any) => def.kind === 'OperationDefinition'
          );
          
          if (!operation) return;
          
          const depth = getQueryDepth(operation.selectionSet);
          const maxDepth = 10;
          
          if (depth > maxDepth) {
            throw new GraphQLError(
              `Query depth ${depth} exceeds maximum allowed depth ${maxDepth}`,
              {
                extensions: {
                  code: 'QUERY_TOO_DEEP',
                  depth,
                  maxDepth,
                },
              }
            );
          }
          
          console.log(`Query depth: ${depth}/${maxDepth}`);
        } catch (error) {
          if (error instanceof GraphQLError) {
            throw error;
          }
          console.error('Error analyzing query complexity:', error);
        }
      },
    };
  },
};

// Helper function to calculate query depth
function getQueryDepth(selectionSet: any, depth = 0): number {
  if (!selectionSet || depth > 15) return depth; // Prevent infinite recursion
  
  let maxDepth = depth;
  
  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field' && selection.selectionSet) {
      const fieldDepth = getQueryDepth(selection.selectionSet, depth + 1);
      maxDepth = Math.max(maxDepth, fieldDepth);
    }
  }
  
  return maxDepth;
} 