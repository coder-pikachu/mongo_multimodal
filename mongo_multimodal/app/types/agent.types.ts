/**
 * Agent System Types
 * Types for multi-agent collaboration and memory systems
 */

import { ObjectId } from 'mongodb';

/**
 * Memory Types
 */

export type MemoryType = 'fact' | 'preference' | 'pattern' | 'insight';

export interface AgentMemory {
  _id?: ObjectId;
  projectId: ObjectId;
  sessionId: string;
  userId?: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    confidence: number;
    accessCount: number;
    lastAccessed: Date;
  };
  relatedMemories: ObjectId[];
  createdAt: Date;
  expiresAt?: Date;
  tags: string[];
}

export interface MemorySearchResult {
  memory: AgentMemory;
  score: number;
}

export interface StoreMemoryInput {
  projectId: string;
  sessionId: string;
  userId?: string;
  type: MemoryType;
  content: string;
  source: string;
  confidence?: number;
  tags?: string[];
  expiresAt?: Date;
}

export interface RetrieveMemoriesInput {
  projectId: string;
  query: string;
  limit?: number;
  type?: MemoryType;
  minConfidence?: number;
}

/**
 * Multi-Agent Collaboration Types
 */

export type AgentType = 'coordinator' | 'search' | 'analysis' | 'memory' | 'synthesis';

export type AgentStatus = 'idle' | 'planning' | 'executing' | 'waiting' | 'completed' | 'failed';

export type MessageType = 'request' | 'response' | 'update' | 'error';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentMessage {
  from: AgentType;
  to: AgentType;
  messageId: string;
  conversationId: string;
  type: MessageType;
  payload: {
    task: string;
    data?: any;
    context?: string;
    priority?: Priority;
    error?: string;
  };
  timestamp: Date;
}

export interface AgentResult {
  agentType: AgentType;
  status: 'pending' | 'completed' | 'failed';
  output: any;
  duration: number;
  tokensUsed?: number;
  error?: string;
}

export interface CoordinatorPlan {
  strategy: string;
  agentsInvolved: AgentType[];
  estimatedSteps: number;
  taskBreakdown: {
    agent: AgentType;
    task: string;
    priority: Priority;
    dependencies?: AgentType[];
  }[];
}

export interface AgentConversation {
  _id?: ObjectId;
  projectId: ObjectId;
  sessionId: string;
  userQuery: string;
  coordinatorPlan: CoordinatorPlan;
  agentMessages: AgentMessage[];
  agentResults: Record<string, AgentResult>;
  finalResponse: string;
  totalDuration: number;
  createdAt: Date;
}

/**
 * Base Agent Interface
 */

export interface BaseAgent {
  type: AgentType;
  status: AgentStatus;
  initialize(context: AgentContext): Promise<void>;
  execute(input: AgentInput): Promise<AgentOutput>;
  handleMessage(message: AgentMessage): Promise<AgentMessage>;
  cleanup(): Promise<void>;
}

export interface AgentContext {
  projectId: string;
  sessionId: string;
  conversationId: string;
  userQuery: string;
  projectName?: string;
  projectDescription?: string;
  memories?: AgentMemory[];
  selectedDataIds?: string[];
}

export interface AgentInput {
  task: string;
  data?: any;
  context?: string;
  priority?: Priority;
  maxSteps?: number;
  timeout?: number;
}

export interface AgentOutput {
  success: boolean;
  result: any;
  metadata?: {
    duration: number;
    tokensUsed?: number;
    toolCalls?: number;
    error?: string;
  };
}

/**
 * Coordination Types
 */

export interface CoordinationState {
  conversationId: string;
  activeAgents: Map<AgentType, AgentStatus>;
  messageQueue: AgentMessage[];
  results: Map<AgentType, AgentResult>;
  startTime: Date;
  currentStep: number;
  maxSteps: number;
}

export interface DelegationTask {
  targetAgent: AgentType;
  task: string;
  data?: any;
  context?: string;
  priority: Priority;
  dependencies?: AgentType[];
  timeout?: number;
}

/**
 * Agent Communication Protocol
 */

export interface AgentRequest extends AgentMessage {
  type: 'request';
  payload: {
    task: string;
    data?: any;
    context?: string;
    priority?: Priority;
    timeoutMs?: number;
  };
}

export interface AgentResponse extends AgentMessage {
  type: 'response';
  payload: {
    task: string;
    data: any;
    context?: string;
    success: boolean;
    error?: string;
  };
}

export interface AgentUpdate extends AgentMessage {
  type: 'update';
  payload: {
    task: string;
    progress: number;
    status: string;
    context?: string;
  };
}

/**
 * Tool Integration Types
 */

export interface ToolResult {
  toolName: string;
  input: any;
  output: any;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface AgentToolExecution {
  agent: AgentType;
  step: number;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  tokens?: number;
  timestamp: Date;
}

