/**
 * Multi-Agent API Route
 * Endpoint for multi-agent collaboration workflows
 */

import { getDb } from '@/lib/mongodb';
import { CoordinatorAgent } from '@/lib/agents/coordinator.agent';
import {
  createCoordinationState,
  saveAgentConversation,
  isCoordinationEnabled,
} from '@/lib/services/coordination.service';
import { AgentContext } from '@/types/agent.types';
import { ObjectId } from 'mongodb';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Check if multi-agent is enabled
    if (!isCoordinationEnabled()) {
      return new Response(
        JSON.stringify({ error: 'Multi-agent coordination is not enabled' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      message,
      projectId,
      sessionId = `multi-agent-${Date.now()}`,
      selectedDataIds,
    } = await req.json();

    if (!message || !projectId) {
      return new Response(
        JSON.stringify({ error: 'message and projectId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Multi-Agent] Starting coordination for query:', message);

    // Get project information
    const db = await getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create conversation ID
    const conversationId = `conv-${Date.now()}`;

    // Create agent context
    const context: AgentContext = {
      projectId,
      sessionId,
      conversationId,
      userQuery: message,
      projectName: project.name,
      projectDescription: project.description,
      selectedDataIds,
    };

    // Create coordination state
    const coordinationState = createCoordinationState(conversationId, 20);

    // Initialize coordinator agent
    const coordinator = new CoordinatorAgent();
    await coordinator.initialize(context);

    // Execute multi-agent workflow
    const result = await coordinator.execute({
      task: message,
      data: { selectedDataIds },
      context: `Project: ${project.name}`,
    });

    // Cleanup
    await coordinator.cleanup();

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: result.metadata?.error || 'Multi-agent execution failed',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Save conversation to database
    await saveAgentConversation(
      db,
      projectId,
      sessionId,
      message,
      result.result.plan,
      coordinationState,
      result.result.synthesis
    );

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        conversationId,
        plan: result.result.plan,
        agentResults: result.result.results,
        synthesis: result.result.synthesis,
        executionTime: result.result.executionTime,
        metadata: {
          agentsUsed: result.result.plan.agentsInvolved,
          totalSteps: result.result.results.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Multi-Agent] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET endpoint to retrieve multi-agent conversation history
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const db = await getDb();
    const conversations = await db
      .collection('agentConversations')
      .find({ projectId: new ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return new Response(
      JSON.stringify({
        conversations: conversations.map(conv => ({
          id: conv._id.toString(),
          userQuery: conv.userQuery,
          agentsInvolved: conv.coordinatorPlan.agentsInvolved,
          totalDuration: conv.totalDuration,
          createdAt: conv.createdAt,
          success: Object.values(conv.agentResults).every(
            (r: any) => r.status === 'completed'
          ),
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Multi-Agent] GET Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

