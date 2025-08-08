import { getDb } from '@/lib/mongodb';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = await getDb();

    // Get all unique sessions for this project
    const sessions = await db.collection('conversations').aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: '$sessionId',
          lastMessage: { $last: '$timestamp' },
          messageCount: { $sum: 1 },
          firstMessage: { $first: '$message.content' }
        }
      },
      { $sort: { lastMessage: -1 } }
    ]).toArray();

    return new Response(JSON.stringify(sessions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch conversations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { sessionId } = await request.json();
    const db = await getDb();

    console.log(`Fetching messages for projectId: ${projectId}, sessionId: ${sessionId}`);

    // Get all messages for this session
    const messages = await db.collection('conversations').find({
      projectId,
      sessionId
    }).sort({ timestamp: 1 }).toArray();

    return new Response(JSON.stringify(messages), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch conversation messages' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}