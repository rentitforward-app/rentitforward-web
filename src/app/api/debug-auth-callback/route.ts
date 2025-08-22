import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  
  // Log all parameters
  const allParams: Record<string, string | null> = {};
  for (const [key, value] of searchParams.entries()) {
    allParams[key] = value;
  }
  
  console.log('Debug auth callback - All parameters:', allParams);
  console.log('Debug auth callback - Full URL:', request.url);
  console.log('Debug auth callback - Origin:', origin);
  
  return NextResponse.json({
    success: true,
    message: 'Debug information logged',
    parameters: allParams,
    fullUrl: request.url,
    origin: origin,
    timestamp: new Date().toISOString()
  });
}
