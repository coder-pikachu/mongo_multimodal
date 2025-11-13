/**
 * Voice usage tracking service
 * Monitors API usage, costs, and user activity for voice features
 */

import { Db, ObjectId } from 'mongodb';

export interface VoiceUsageLog {
  _id?: ObjectId;
  userId: string;
  projectId: string;
  sessionId: string;
  sessionToken: string; // Hashed for security
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
  audioMinutes?: number;
  totalAudioBytes?: number;
  toolCallsCount?: number;
  toolCalls?: Array<{
    tool: string;
    timestamp: Date;
    durationMs: number;
  }>;
  estimatedCost?: number; // USD
  status: 'active' | 'completed' | 'error' | 'timeout';
  errorMessage?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    model?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceUsageStats {
  totalSessions: number;
  totalMinutes: number;
  totalCost: number;
  averageSessionDuration: number;
  toolCallsTotal: number;
  sessionsToday: number;
  costToday: number;
  topProjects: Array<{
    projectId: string;
    sessions: number;
    minutes: number;
  }>;
}

/**
 * Gemini Live API pricing (as of 2025)
 * https://ai.google.dev/pricing
 */
const PRICING = {
  AUDIO_PER_MINUTE: 0.002, // $0.002 per minute of audio
  INPUT_TOKENS_PER_1M: 0, // Free for now (may change)
  OUTPUT_TOKENS_PER_1M: 0, // Free for now (may change)
};

/**
 * Start tracking a new voice session
 *
 * @param db - MongoDB database connection
 * @param params - Session parameters
 * @returns Created usage log ID
 */
export async function startVoiceSession(
  db: Db,
  params: {
    userId: string;
    projectId: string;
    sessionId: string;
    sessionToken: string;
    metadata?: VoiceUsageLog['metadata'];
  }
): Promise<ObjectId> {
  const now = new Date();

  // Hash the token for security (don't store actual token)
  const hashedToken = await hashToken(params.sessionToken);

  const log: Omit<VoiceUsageLog, '_id'> = {
    userId: params.userId,
    projectId: params.projectId,
    sessionId: params.sessionId,
    sessionToken: hashedToken,
    startTime: now,
    status: 'active',
    toolCallsCount: 0,
    toolCalls: [],
    metadata: params.metadata,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<VoiceUsageLog>('voiceUsageLogs').insertOne(log as any);

  return result.insertedId;
}

/**
 * End a voice session and calculate final metrics
 *
 * @param db - MongoDB database connection
 * @param sessionId - Session ID to end
 * @param params - Final session data
 */
export async function endVoiceSession(
  db: Db,
  sessionId: string,
  params: {
    totalAudioBytes?: number;
    status?: 'completed' | 'error' | 'timeout';
    errorMessage?: string;
  } = {}
): Promise<void> {
  const now = new Date();

  // Find the session
  const session = await db
    .collection<VoiceUsageLog>('voiceUsageLogs')
    .findOne({ sessionId, status: 'active' });

  if (!session) {
    console.warn(`[VoiceUsage] Session ${sessionId} not found or already ended`);
    return;
  }

  // Calculate duration
  const durationMs = now.getTime() - session.startTime.getTime();
  const durationSeconds = Math.round(durationMs / 1000);
  const audioMinutes = durationSeconds / 60;

  // Calculate estimated cost
  const estimatedCost = audioMinutes * PRICING.AUDIO_PER_MINUTE;

  // Update the session
  await db.collection<VoiceUsageLog>('voiceUsageLogs').updateOne(
    { sessionId, status: 'active' },
    {
      $set: {
        endTime: now,
        durationSeconds,
        audioMinutes: Number(audioMinutes.toFixed(2)),
        totalAudioBytes: params.totalAudioBytes,
        estimatedCost: Number(estimatedCost.toFixed(4)),
        status: params.status || 'completed',
        errorMessage: params.errorMessage,
        updatedAt: now,
      },
    }
  );

  console.log(
    `[VoiceUsage] Session ${sessionId} ended: ${audioMinutes.toFixed(2)} minutes, $${estimatedCost.toFixed(4)}`
  );
}

/**
 * Record a tool call during a voice session
 *
 * @param db - MongoDB database connection
 * @param sessionId - Session ID
 * @param toolCall - Tool call details
 */
export async function recordToolCall(
  db: Db,
  sessionId: string,
  toolCall: {
    tool: string;
    durationMs: number;
  }
): Promise<void> {
  await db.collection<VoiceUsageLog>('voiceUsageLogs').updateOne(
    { sessionId, status: 'active' },
    {
      $push: {
        toolCalls: {
          tool: toolCall.tool,
          timestamp: new Date(),
          durationMs: toolCall.durationMs,
        },
      } as any,
      $inc: { toolCallsCount: 1 },
      $set: { updatedAt: new Date() },
    }
  );
}

/**
 * Get usage statistics for a user or project
 *
 * @param db - MongoDB database connection
 * @param params - Filter parameters
 * @returns Usage statistics
 */
export async function getVoiceUsageStats(
  db: Db,
  params: {
    userId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<VoiceUsageStats> {
  const filter: any = {};

  if (params.userId) filter.userId = params.userId;
  if (params.projectId) filter.projectId = params.projectId;
  if (params.startDate || params.endDate) {
    filter.startTime = {};
    if (params.startDate) filter.startTime.$gte = params.startDate;
    if (params.endDate) filter.startTime.$lte = params.endDate;
  }

  const sessions = await db
    .collection<VoiceUsageLog>('voiceUsageLogs')
    .find(filter)
    .toArray();

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.audioMinutes || 0), 0);
  const totalCost = sessions.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);
  const averageSessionDuration =
    totalSessions > 0
      ? sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / totalSessions
      : 0;
  const toolCallsTotal = sessions.reduce((sum, s) => sum + (s.toolCallsCount || 0), 0);

  // Calculate today's usage
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sessionsToday = sessions.filter((s) => s.startTime >= todayStart);
  const costToday = sessionsToday.reduce((sum, s) => sum + (s.estimatedCost || 0), 0);

  // Top projects
  const projectMap = new Map<string, { sessions: number; minutes: number }>();
  sessions.forEach((s) => {
    const existing = projectMap.get(s.projectId) || { sessions: 0, minutes: 0 };
    projectMap.set(s.projectId, {
      sessions: existing.sessions + 1,
      minutes: existing.minutes + (s.audioMinutes || 0),
    });
  });

  const topProjects = Array.from(projectMap.entries())
    .map(([projectId, stats]) => ({ projectId, ...stats }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);

  return {
    totalSessions,
    totalMinutes: Number(totalMinutes.toFixed(2)),
    totalCost: Number(totalCost.toFixed(4)),
    averageSessionDuration: Number(averageSessionDuration.toFixed(0)),
    toolCallsTotal,
    sessionsToday: sessionsToday.length,
    costToday: Number(costToday.toFixed(4)),
    topProjects,
  };
}

/**
 * Clean up old usage logs (retention policy)
 * Typically run as a cron job
 *
 * @param db - MongoDB database connection
 * @param olderThanDays - Delete logs older than this many days
 * @returns Number of deleted logs
 */
export async function cleanupOldUsageLogs(
  db: Db,
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db.collection<VoiceUsageLog>('voiceUsageLogs').deleteMany({
    startTime: { $lt: cutoffDate },
  });

  console.log(`[VoiceUsage] Cleaned up ${result.deletedCount} logs older than ${olderThanDays} days`);

  return result.deletedCount;
}

/**
 * Hash a token for secure storage
 * Uses Web Crypto API for SHA-256 hashing
 *
 * @param token - Token to hash
 * @returns Hashed token (hex string)
 */
async function hashToken(token: string): Promise<string> {
  // Use Node.js crypto in server environment
  if (typeof window === 'undefined') {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Fallback for browser (shouldn't be used)
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
