/**
 * Base Agent Class
 * Abstract base class for all specialized agents in the multi-agent system
 */

import {
  BaseAgent,
  AgentType,
  AgentStatus,
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentMessage,
  MessageType,
  Priority,
} from '@/types/agent.types';
import { getDb } from '@/lib/mongodb';
import { Db } from 'mongodb';

/**
 * Abstract base agent implementation
 */
export abstract class Agent implements BaseAgent {
  public type: AgentType;
  public status: AgentStatus;
  protected context?: AgentContext;
  protected db?: Db;
  protected startTime?: Date;

  constructor(type: AgentType) {
    this.type = type;
    this.status = 'idle';
  }

  /**
   * Initialize the agent with context
   */
  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
    this.db = await getDb();
    this.status = 'planning';
    this.startTime = new Date();
    console.log(`[${this.type}] Agent initialized for project ${context.projectId}`);
  }

  /**
   * Execute agent's main task
   * Must be implemented by subclasses
   */
  abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Handle incoming messages from other agents
   */
  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    console.log(`[${this.type}] Received message from ${message.from}:`, message.payload.task);

    this.status = 'executing';

    try {
      // Execute the task from the message
      const result = await this.execute({
        task: message.payload.task,
        data: message.payload.data,
        context: message.payload.context,
        priority: message.payload.priority,
      });

      // Create response message
      const response: AgentMessage = {
        from: this.type,
        to: message.from,
        messageId: `${this.type}-response-${Date.now()}`,
        conversationId: message.conversationId,
        type: 'response',
        payload: {
          task: message.payload.task,
          data: result.success ? result.result : null,
          context: result.success ? 'success' : result.metadata?.error,
        },
        timestamp: new Date(),
      };

      this.status = 'completed';
      return response;
    } catch (error) {
      this.status = 'failed';

      // Create error response
      const errorResponse: AgentMessage = {
        from: this.type,
        to: message.from,
        messageId: `${this.type}-error-${Date.now()}`,
        conversationId: message.conversationId,
        type: 'error',
        payload: {
          task: message.payload.task,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date(),
      };

      return errorResponse;
    }
  }

  /**
   * Send a message to another agent
   */
  protected createMessage(
    to: AgentType,
    type: MessageType,
    task: string,
    data?: any,
    context?: string,
    priority: Priority = 'medium'
  ): AgentMessage {
    if (!this.context) {
      throw new Error('Agent not initialized');
    }

    return {
      from: this.type,
      to,
      messageId: `${this.type}-${type}-${Date.now()}`,
      conversationId: this.context.conversationId,
      type,
      payload: {
        task,
        data,
        context,
        priority,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Create success output
   */
  protected createSuccessOutput(result: any, metadata?: any): AgentOutput {
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      success: true,
      result,
      metadata: {
        duration,
        ...metadata,
      },
    };
  }

  /**
   * Create error output
   */
  protected createErrorOutput(error: string, metadata?: any): AgentOutput {
    const duration = this.startTime ? Date.now() - this.startTime.getTime() : 0;

    return {
      success: false,
      result: null,
      metadata: {
        duration,
        error,
        ...metadata,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.status = 'idle';
    console.log(`[${this.type}] Agent cleanup completed`);
  }

  /**
   * Get agent context
   */
  protected getContext(): AgentContext {
    if (!this.context) {
      throw new Error('Agent not initialized - context is undefined');
    }
    return this.context;
  }

  /**
   * Get database connection
   */
  protected getDb(): Db {
    if (!this.db) {
      throw new Error('Agent not initialized - database connection is undefined');
    }
    return this.db;
  }

  /**
   * Log agent activity
   */
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.type}] ${message}`, data || '');
  }

  /**
   * Send progress update
   */
  protected createProgressUpdate(
    to: AgentType,
    task: string,
    progress: number,
    status: string
  ): AgentMessage {
    if (!this.context) {
      throw new Error('Agent not initialized');
    }

    return {
      from: this.type,
      to,
      messageId: `${this.type}-update-${Date.now()}`,
      conversationId: this.context.conversationId,
      type: 'update',
      payload: {
        task,
        data: { progress, status },
      },
      timestamp: new Date(),
    };
  }
}

/**
 * Helper function to create agent instances
 */
export function createAgent(type: AgentType): Agent {
  switch (type) {
    case 'coordinator':
      // Will be imported from coordinator.agent.ts
      throw new Error('Coordinator agent must be imported separately');
    case 'search':
      throw new Error('Search agent must be imported separately');
    case 'analysis':
      throw new Error('Analysis agent must be imported separately');
    case 'memory':
      throw new Error('Memory agent must be imported separately');
    case 'synthesis':
      throw new Error('Synthesis agent must be imported separately');
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

