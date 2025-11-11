/**
 * Coordination Service
 * Handles message routing and state management for multi-agent systems
 */

import { Db, ObjectId } from 'mongodb';
import {
  AgentMessage,
  AgentType,
  AgentResult,
  CoordinationState,
  AgentConversation,
  CoordinatorPlan,
} from '@/types/agent.types';

/**
 * Create a new coordination state
 */
export function createCoordinationState(
  conversationId: string,
  maxSteps: number = 20
): CoordinationState {
  return {
    conversationId,
    activeAgents: new Map(),
    messageQueue: [],
    results: new Map(),
    startTime: new Date(),
    currentStep: 0,
    maxSteps,
  };
}

/**
 * Route a message to the appropriate agent
 */
export async function routeMessage(
  state: CoordinationState,
  message: AgentMessage
): Promise<void> {
  console.log(`[Coordination] Routing message from ${message.from} to ${message.to}`);

  // Update agent status
  state.activeAgents.set(message.to, 'executing');

  // Add to message queue
  state.messageQueue.push(message);

  // Increment step counter
  state.currentStep++;

  if (state.currentStep >= state.maxSteps) {
    console.warn(`[Coordination] Max steps (${state.maxSteps}) reached`);
  }
}

/**
 * Record agent result
 */
export function recordAgentResult(
  state: CoordinationState,
  agentType: AgentType,
  result: AgentResult
): void {
  console.log(`[Coordination] Recording result for ${agentType} agent`);

  state.results.set(agentType, result);
  state.activeAgents.set(agentType, result.status === 'completed' ? 'completed' : 'failed');
}

/**
 * Get messages for a specific agent
 */
export function getMessagesForAgent(
  state: CoordinationState,
  agentType: AgentType
): AgentMessage[] {
  return state.messageQueue.filter(msg => msg.to === agentType);
}

/**
 * Get messages from a specific agent
 */
export function getMessagesFromAgent(
  state: CoordinationState,
  agentType: AgentType
): AgentMessage[] {
  return state.messageQueue.filter(msg => msg.from === agentType);
}

/**
 * Check if all agents have completed
 */
export function areAllAgentsComplete(state: CoordinationState): boolean {
  for (const status of state.activeAgents.values()) {
    if (status !== 'completed' && status !== 'failed') {
      return false;
    }
  }
  return true;
}

/**
 * Get coordination summary
 */
export function getCoordinationSummary(state: CoordinationState): {
  totalMessages: number;
  totalDuration: number;
  agentStatuses: Record<string, string>;
  completedAgents: number;
  failedAgents: number;
} {
  const now = new Date();
  const totalDuration = now.getTime() - state.startTime.getTime();

  const agentStatuses: Record<string, string> = {};
  let completedAgents = 0;
  let failedAgents = 0;

  for (const [agent, status] of state.activeAgents.entries()) {
    agentStatuses[agent] = status;
    if (status === 'completed') completedAgents++;
    if (status === 'failed') failedAgents++;
  }

  return {
    totalMessages: state.messageQueue.length,
    totalDuration,
    agentStatuses,
    completedAgents,
    failedAgents,
  };
}

/**
 * Save agent conversation to database
 */
export async function saveAgentConversation(
  db: Db,
  projectId: string,
  sessionId: string,
  userQuery: string,
  plan: CoordinatorPlan,
  state: CoordinationState,
  finalResponse: string
): Promise<ObjectId | null> {
  try {
    const summary = getCoordinationSummary(state);

    const agentResults: Record<string, AgentResult> = {};
    for (const [agent, result] of state.results.entries()) {
      agentResults[agent] = result;
    }

    const conversation: AgentConversation = {
      projectId: new ObjectId(projectId),
      sessionId,
      userQuery,
      coordinatorPlan: plan,
      agentMessages: state.messageQueue,
      agentResults,
      finalResponse,
      totalDuration: summary.totalDuration,
      createdAt: new Date(),
    };

    const result = await db.collection('agentConversations').insertOne(conversation);
    console.log('[Coordination] Saved agent conversation:', result.insertedId);

    return result.insertedId;
  } catch (error) {
    console.error('[Coordination] Failed to save agent conversation:', error);
    return null;
  }
}

/**
 * Get agent conversation history
 */
export async function getAgentConversations(
  db: Db,
  projectId: string,
  limit: number = 10
): Promise<AgentConversation[]> {
  try {
    const conversations = await db
      .collection('agentConversations')
      .find({ projectId: new ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return conversations as AgentConversation[];
  } catch (error) {
    console.error('[Coordination] Failed to get agent conversations:', error);
    return [];
  }
}

/**
 * Get agent performance analytics
 */
export async function getAgentAnalytics(
  db: Db,
  projectId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalConversations: number;
  averageDuration: number;
  agentUsageCount: Record<string, number>;
  successRate: Record<string, number>;
  averageStepsPerConversation: number;
}> {
  try {
    const filter: any = {};

    if (projectId) {
      filter.projectId = new ObjectId(projectId);
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const conversations = await db
      .collection('agentConversations')
      .find(filter)
      .toArray() as AgentConversation[];

    const totalConversations = conversations.length;

    if (totalConversations === 0) {
      return {
        totalConversations: 0,
        averageDuration: 0,
        agentUsageCount: {},
        successRate: {},
        averageStepsPerConversation: 0,
      };
    }

    let totalDuration = 0;
    let totalSteps = 0;
    const agentUsageCount: Record<string, number> = {};
    const agentSuccessCount: Record<string, number> = {};
    const agentTotalCount: Record<string, number> = {};

    conversations.forEach(conv => {
      totalDuration += conv.totalDuration;
      totalSteps += conv.agentMessages.length;

      // Count agent usage and success
      Object.entries(conv.agentResults).forEach(([agent, result]) => {
        agentUsageCount[agent] = (agentUsageCount[agent] || 0) + 1;
        agentTotalCount[agent] = (agentTotalCount[agent] || 0) + 1;

        if (result.status === 'completed') {
          agentSuccessCount[agent] = (agentSuccessCount[agent] || 0) + 1;
        }
      });
    });

    const successRate: Record<string, number> = {};
    Object.keys(agentTotalCount).forEach(agent => {
      const total = agentTotalCount[agent];
      const success = agentSuccessCount[agent] || 0;
      successRate[agent] = total > 0 ? success / total : 0;
    });

    return {
      totalConversations,
      averageDuration: totalDuration / totalConversations,
      agentUsageCount,
      successRate,
      averageStepsPerConversation: totalSteps / totalConversations,
    };
  } catch (error) {
    console.error('[Coordination] Failed to get agent analytics:', error);
    return {
      totalConversations: 0,
      averageDuration: 0,
      agentUsageCount: {},
      successRate: {},
      averageStepsPerConversation: 0,
    };
  }
}

/**
 * Check if coordination is enabled
 */
export function isCoordinationEnabled(): boolean {
  return process.env.MULTI_AGENT_ENABLED !== 'false';
}

/**
 * Create agent message
 */
export function createAgentMessage(
  from: AgentType,
  to: AgentType,
  conversationId: string,
  type: 'request' | 'response' | 'update' | 'error',
  task: string,
  data?: any
): AgentMessage {
  return {
    from,
    to,
    messageId: `${from}-${to}-${Date.now()}`,
    conversationId,
    type,
    payload: {
      task,
      data,
    },
    timestamp: new Date(),
  };
}

