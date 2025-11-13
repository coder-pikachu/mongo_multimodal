/**
 * Voice Session Token Generation API
 * Generates temporary JWT tokens for secure voice interactions
 * Requires Clerk authentication
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateVoiceSessionToken } from '@/lib/jwt';
import { voiceSessionLimiter } from '@/lib/rate-limiter';
import { getDb } from '@/lib/mongodb';
import { startVoiceSession } from '@/lib/services/voice-usage.service';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Clerk authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // 2. Check rate limit (10 sessions per minute per user)
    const rateLimit = await voiceSessionLimiter.check(userId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many voice sessions. Please wait ${rateLimit.retryAfter} seconds.`,
          retryAfter: rateLimit.retryAfter,
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Bad Request - projectId is required' },
        { status: 400 }
      );
    }

    // 4. Verify user has access to project
    // TODO: Add project ownership check from your auth logic
    // const hasAccess = await checkProjectAccess(userId, projectId);
    // if (!hasAccess) { return 403 }

    // 5. Generate unique session ID
    const sessionId = `voice_${Date.now()}_${randomBytes(8).toString('hex')}`;

    // 6. Generate JWT token (15 minute expiry)
    const token = await generateVoiceSessionToken(
      {
        userId,
        projectId,
        sessionId,
      },
      15 // 15 minutes
    );

    // 7. Start tracking usage
    try {
      const db = await getDb();
      await startVoiceSession(db, {
        userId,
        projectId,
        sessionId,
        sessionToken: token,
        metadata: {
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        },
      });
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('[Voice Session] Failed to start usage tracking:', error);
    }

    // 8. Return session token
    return NextResponse.json(
      {
        success: true,
        sessionId,
        token,
        expiresIn: 900, // 15 minutes in seconds
        expiresAt: new Date(Date.now() + 900000).toISOString(),
        endpoint: '/api/voice/stream',
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error('[Voice Session] Error generating token:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to generate session token',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check session status
 * Useful for debugging and monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current rate limit status
    const rateLimit = voiceSessionLimiter.getStatus(userId);

    return NextResponse.json({
      userId,
      rateLimit: {
        requests: rateLimit.requests,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    });
  } catch (error) {
    console.error('[Voice Session] Error checking status:', error);

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
