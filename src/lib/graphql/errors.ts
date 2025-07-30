import { GraphQLError, GraphQLFormattedError } from 'graphql';

// Custom GraphQL Error Classes
export class AuthenticationError extends GraphQLError {
  constructor(message: string = 'Authentication required') {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: {
          status: 401,
        },
      },
    });
  }
}

export class ForbiddenError extends GraphQLError {
  constructor(message: string = 'Access denied') {
    super(message, {
      extensions: {
        code: 'FORBIDDEN',
        http: {
          status: 403,
        },
      },
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field,
        http: {
          status: 400,
        },
      },
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(message: string = 'Resource not found') {
    super(message, {
      extensions: {
        code: 'NOT_FOUND',
        http: {
          status: 404,
        },
      },
    });
  }
}

export class ConflictError extends GraphQLError {
  constructor(message: string = 'Resource conflict') {
    super(message, {
      extensions: {
        code: 'CONFLICT',
        http: {
          status: 409,
        },
      },
    });
  }
}

export class RateLimitError extends GraphQLError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, {
      extensions: {
        code: 'RATE_LIMITED',
        http: {
          status: 429,
        },
      },
    });
  }
}

export class InternalServerError extends GraphQLError {
  constructor(message: string = 'Internal server error') {
    super(message, {
      extensions: {
        code: 'INTERNAL_ERROR',
        http: {
          status: 500,
        },
      },
    });
  }
}

// Error formatting function for Apollo Server
export function formatError(formattedError: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
  // Log the error for debugging
  console.error('GraphQL Error:', {
    message: formattedError.message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: formattedError.extensions,
    originalError: error,
  });

  // In production, don't expose internal errors
  if (process.env.NODE_ENV === 'production') {
    // Only expose safe error codes to clients
    const safeErrorCodes = [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'CONFLICT',
      'RATE_LIMITED',
    ];

    const errorCode = formattedError.extensions?.code as string;
    
    if (!safeErrorCodes.includes(errorCode)) {
      return new GraphQLError('Internal server error', {
        extensions: {
          code: 'INTERNAL_ERROR',
          http: {
            status: 500,
          },
        },
      });
    }
  }

  return formattedError;
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): GraphQLError {
  if (!error) {
    return new InternalServerError();
  }

  // Handle specific Supabase error codes
  switch (error.code) {
    case 'PGRST116': // Row not found
      return new NotFoundError('Resource not found');
    
    case 'PGRST301': // Unique constraint violation
      return new ConflictError('Resource already exists');
    
    case '23505': // Unique violation
      return new ConflictError('Duplicate entry');
    
    case '23503': // Foreign key violation
      return new ValidationError('Invalid reference');
    
    case '23514': // Check constraint violation
      return new ValidationError('Invalid data');
    
    case 'PGRST204': // RLS violation
      return new ForbiddenError('Access denied');
    
    default:
      console.error('Unhandled Supabase error:', error);
      return new InternalServerError(
        process.env.NODE_ENV === 'development' 
          ? `Supabase error: ${error.message}` 
          : 'Database operation failed'
      );
  }
}

// Helper function to validate and sanitize input
export function validateInput<T>(input: T, schema: any): T {
  try {
    return schema.parse(input);
  } catch (error: any) {
    if (error.errors) {
      const message = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ValidationError(message);
    }
    throw new ValidationError('Invalid input');
  }
}

// Rate limiting error tracking
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): void {
  const now = Date.now();
  const key = identifier;
  const window = rateLimitMap.get(key);

  if (!window || now > window.resetTime) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (window.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((window.resetTime - now) / 1000)} seconds.`);
  }

  window.count++;
}

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of rateLimitMap.entries()) {
    if (now > window.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute 