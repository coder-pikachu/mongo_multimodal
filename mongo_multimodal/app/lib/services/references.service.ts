/**
 * References Service
 * Handles bidirectional reference tracking between conversations and project data
 */

import { Db, ObjectId } from 'mongodb';
import { ConversationReference, Reference } from '@/app/types/models';

/**
 * Add reference to project data (track which conversations used it)
 */
export async function addReferenceToProjectData(
  db: Db,
  dataId: string,
  conversationId: string,
  sessionId: string,
  context: string,
  toolCall: string
): Promise<void> {
  try {
    const reference: Reference = {
      conversationId: new ObjectId(conversationId),
      sessionId,
      timestamp: new Date(),
      context,
      toolCall,
    };

    await db.collection('projectData').updateOne(
      { _id: new ObjectId(dataId) },
      {
        $push: { referencedBy: reference },
        $set: { updatedAt: new Date() },
      }
    );
  } catch (error) {
    console.error('Error adding reference to project data:', error);
    // Don't throw - reference tracking should not break the main flow
  }
}

/**
 * Add multiple references to project data (bulk operation)
 */
export async function addBulkReferencesToProjectData(
  db: Db,
  references: Array<{
    dataId: string;
    conversationId: string;
    sessionId: string;
    context: string;
    toolCall: string;
  }>
): Promise<void> {
  try {
    const bulkOps = references.map((ref) => ({
      updateOne: {
        filter: { _id: new ObjectId(ref.dataId) },
        update: {
          $push: {
            referencedBy: {
              conversationId: new ObjectId(ref.conversationId),
              sessionId: ref.sessionId,
              timestamp: new Date(),
              context: ref.context,
              toolCall: ref.toolCall,
            },
          },
          $set: { updatedAt: new Date() },
        },
      },
    }));

    if (bulkOps.length > 0) {
      await db.collection('projectData').bulkWrite(bulkOps);
    }
  } catch (error) {
    console.error('Error adding bulk references to project data:', error);
    // Don't throw - reference tracking should not break the main flow
  }
}

/**
 * Get references for a project data item
 */
export async function getProjectDataReferences(
  db: Db,
  dataId: string
): Promise<Reference[]> {
  try {
    const item = await db.collection('projectData').findOne(
      { _id: new ObjectId(dataId) },
      { projection: { referencedBy: 1 } }
    );

    return item?.referencedBy || [];
  } catch (error) {
    console.error('Error getting project data references:', error);
    return [];
  }
}

/**
 * Get conversation references (what sources were used in a conversation)
 */
export async function getConversationReferences(
  db: Db,
  sessionId: string
): Promise<ConversationReference[]> {
  try {
    const conversations = await db
      .collection('conversations')
      .find(
        { sessionId },
        { projection: { references: 1 } }
      )
      .toArray();

    const allReferences: ConversationReference[] = [];
    for (const conv of conversations) {
      if (conv.references && Array.isArray(conv.references)) {
        allReferences.push(...conv.references);
      }
    }

    return allReferences;
  } catch (error) {
    console.error('Error getting conversation references:', error);
    return [];
  }
}

/**
 * Extract references from tool results
 * This analyzes tool outputs to identify what sources were used
 */
export function extractReferencesFromToolResults(
  toolExecutions: Array<{ tool: string; input: any; output: any; step: number }>,
  projectId?: string
): ConversationReference[] {
  const references: ConversationReference[] = [];

  for (const execution of toolExecutions) {
    try {
      switch (execution.tool) {
        case 'searchProjectData': {
          const results = execution.output?.results || [];
          for (const result of results) {
            if (result.id) {
              references.push({
                type: 'projectData',
                dataId: result.id,
                title: result.filename || 'Unknown',
                usedInStep: execution.step,
                toolCall: 'searchProjectData',
                score: result.score,
              });
            }
          }
          break;
        }

        case 'analyzeImage': {
          const output = execution.output;
          if (output?.dataId) {
            references.push({
              type: 'projectData',
              dataId: output.dataId,
              title: output.filename || 'Unknown',
              usedInStep: execution.step,
              toolCall: 'analyzeImage',
            });
          }
          break;
        }

        case 'projectDataAnalysis': {
          const output = execution.output;
          if (output?.id) {
            references.push({
              type: 'projectData',
              dataId: output.id,
              title: output.filename || 'Unknown',
              usedInStep: execution.step,
              toolCall: 'projectDataAnalysis',
            });
          }
          break;
        }

        case 'searchWeb': {
          const output = execution.output;
          if (output?.citations) {
            for (let i = 0; i < output.citations.length; i++) {
              const citation = output.citations[i];
              if (typeof citation === 'string') {
                references.push({
                  type: 'web',
                  url: citation,
                  title: citation,
                  usedInStep: execution.step,
                  toolCall: 'searchWeb',
                });
              }
            }
          }
          break;
        }

        case 'sendEmail': {
          const input = execution.input;
          if (input?.to) {
            references.push({
              type: 'email',
              title: `Email to ${input.to}`,
              usedInStep: execution.step,
              toolCall: 'sendEmail',
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error extracting references from tool execution:', error);
      // Continue processing other executions
    }
  }

  // Deduplicate references by dataId/url
  const uniqueRefs = new Map<string, ConversationReference>();
  for (const ref of references) {
    const key = ref.dataId || ref.url || ref.title;
    if (!uniqueRefs.has(key) || (ref.score && (!uniqueRefs.get(key)?.score || ref.score > uniqueRefs.get(key)!.score!))) {
      uniqueRefs.set(key, ref);
    }
  }

  return Array.from(uniqueRefs.values());
}

/**
 * Update conversation with references after completion
 */
export async function updateConversationWithReferences(
  db: Db,
  conversationId: string,
  references: ConversationReference[],
  sessionId: string,
  userQuery: string
): Promise<void> {
  try {
    // Update conversation with references
    await db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $set: { references } }
    );

    // Add references to project data items
    const projectDataRefs = references.filter((ref) => ref.type === 'projectData' && ref.dataId);

    await addBulkReferencesToProjectData(
      db,
      projectDataRefs.map((ref) => ({
        dataId: ref.dataId!,
        conversationId,
        sessionId,
        context: userQuery,
        toolCall: ref.toolCall,
      }))
    );
  } catch (error) {
    console.error('Error updating conversation with references:', error);
    // Don't throw - this is a background operation
  }
}
