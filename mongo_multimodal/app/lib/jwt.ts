/**
 * JWT utilities for secure voice session token management
 * Uses jose library for modern, secure JWT handling
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';

// Secret key for signing tokens (from environment)
const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error('JWT_SECRET or CLERK_SECRET_KEY must be set in environment');
  }
  return new TextEncoder().encode(secret);
};

export interface VoiceSessionPayload extends JWTPayload {
  userId: string;
  projectId: string;
  scope: 'voice-session';
  sessionId: string;
  exp?: number;
  iat?: number;
}

/**
 * Generate a temporary JWT token for voice session access
 * Token expires after 15 minutes by default
 *
 * @param payload - Session data to embed in token
 * @param expiresInMinutes - Token lifetime (default: 15 minutes)
 * @returns Signed JWT token string
 */
export async function generateVoiceSessionToken(
  payload: Omit<VoiceSessionPayload, 'exp' | 'iat' | 'scope'>,
  expiresInMinutes: number = 15
): Promise<string> {
  const secret = getSecretKey();

  const token = await new SignJWT({
    ...payload,
    scope: 'voice-session' as const,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInMinutes}m`)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a voice session token
 * Throws error if token is invalid, expired, or tampered with
 *
 * @param token - JWT token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid
 */
export async function verifyVoiceSessionToken(
  token: string
): Promise<VoiceSessionPayload> {
  try {
    const secret = getSecretKey();

    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    // Verify scope
    if (payload.scope !== 'voice-session') {
      throw new Error('Invalid token scope');
    }

    return payload as VoiceSessionPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error('Token verification failed: Unknown error');
  }
}

/**
 * Extract token from Authorization header
 * Supports both "Bearer <token>" and plain token formats
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null if not found
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // Handle "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Handle plain token
  return authHeader;
}

/**
 * Check if token is about to expire (within 2 minutes)
 * Useful for proactive token refresh on client
 *
 * @param payload - Decoded JWT payload
 * @returns True if token expires within 2 minutes
 */
export function isTokenExpiringSoon(payload: VoiceSessionPayload): boolean {
  if (!payload.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;

  // Return true if less than 2 minutes remaining
  return timeUntilExpiry < 120;
}
