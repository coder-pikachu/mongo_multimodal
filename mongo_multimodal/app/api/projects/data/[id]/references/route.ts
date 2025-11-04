/**
 * API endpoint for viewing references to/from a specific project data item
 */

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getProjectDataReferences } from '@/lib/services/references.service';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        { error: 'Valid item ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get the item to verify it exists
    const item = await db.collection('projectData').findOne(
      { _id: new ObjectId(id) },
      { projection: { _id: 1, metadata: 1, type: 1, projectId: 1 } }
    );

    if (!item) {
      return Response.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Get references (where this item was used in conversations)
    const references = await getProjectDataReferences(db, id);

    // Get conversation details for each reference
    const enrichedReferences = await Promise.all(
      references.map(async (ref) => {
        try {
          const conversation = await db.collection('conversations').findOne(
            { _id: ref.conversationId },
            { projection: { message: 1, timestamp: 1, sessionId: 1 } }
          );

          return {
            conversationId: ref.conversationId.toString(),
            sessionId: ref.sessionId,
            timestamp: ref.timestamp,
            context: ref.context,
            toolCall: ref.toolCall,
            userMessage: conversation?.message?.role === 'user'
              ? conversation.message.content.substring(0, 200)
              : null,
            conversationTimestamp: conversation?.timestamp
          };
        } catch (error) {
          console.error('Error enriching reference:', error);
          return {
            conversationId: ref.conversationId.toString(),
            sessionId: ref.sessionId,
            timestamp: ref.timestamp,
            context: ref.context,
            toolCall: ref.toolCall,
            userMessage: null,
            conversationTimestamp: null
          };
        }
      })
    );

    return Response.json({
      itemId: id,
      filename: item.metadata?.filename || 'Unknown',
      type: item.type,
      projectId: item.projectId?.toString(),
      totalReferences: references.length,
      references: enrichedReferences.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    });
  } catch (error) {
    console.error('Error fetching references:', error);
    return Response.json(
      { error: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}
