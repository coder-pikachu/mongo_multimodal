/**
 * Coordinator Agent
 * Master agent that orchestrates multi-agent collaboration
 */

import { Agent } from './base.agent';
import { SearchAgent } from './search.agent';
import { AnalysisAgent } from './analysis.agent';
import { MemoryAgent } from './memory.agent';
import { SynthesisAgent } from './synthesis.agent';
import {
  AgentInput,
  AgentOutput,
  AgentType,
  AgentMessage,
  CoordinatorPlan,
  DelegationTask,
  Priority,
} from '@/types/agent.types';

export class CoordinatorAgent extends Agent {
  private agents: Map<AgentType, Agent>;
  private taskResults: Map<AgentType, AgentOutput>;

  constructor() {
    super('coordinator');
    this.agents = new Map();
    this.taskResults = new Map();
  }

  async initialize(context: any): Promise<void> {
    await super.initialize(context);

    // Initialize specialist agents
    const searchAgent = new SearchAgent();
    const analysisAgent = new AnalysisAgent();
    const memoryAgent = new MemoryAgent();
    const synthesisAgent = new SynthesisAgent();

    await Promise.all([
      searchAgent.initialize(context),
      analysisAgent.initialize(context),
      memoryAgent.initialize(context),
      synthesisAgent.initialize(context),
    ]);

    this.agents.set('search', searchAgent);
    this.agents.set('analysis', analysisAgent);
    this.agents.set('memory', memoryAgent);
    this.agents.set('synthesis', synthesisAgent);

    this.log('All specialist agents initialized');
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log('Coordinating multi-agent execution', { task: input.task });
    this.status = 'planning';

    try {
      // Step 1: Create execution plan
      const plan = await this.createPlan(input);
      this.log('Execution plan created', { agentsInvolved: plan.agentsInvolved });

      // Step 2: Retrieve relevant memories
      const memoryContext = await this.retrieveMemoryContext(input);

      // Step 3: Execute delegation tasks
      this.status = 'executing';
      const results = await this.executePlan(plan, input);

      // Step 4: Synthesize results
      const synthesis = await this.synthesizeResults(results, input, memoryContext);

      // Step 5: Store important memories
      await this.storeMemories(input, synthesis, results);

      this.status = 'completed';

      return this.createSuccessOutput({
        plan,
        results: Array.from(results.entries()).map(([agent, result]) => ({
          agent,
          success: result.success,
          data: result.result,
        })),
        synthesis: synthesis.result,
        executionTime: synthesis.metadata?.duration,
      });
    } catch (error) {
      this.log('Coordination error', error);
      this.status = 'failed';
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Coordination failed'
      );
    }
  }

  /**
   * Create execution plan
   */
  private async createPlan(input: AgentInput): Promise<CoordinatorPlan> {
    const context = this.getContext();
    const task = input.task.toLowerCase();

    // Analyze query to determine required agents
    const agentsNeeded: AgentType[] = [];
    const taskBreakdown: DelegationTask[] = [];

    // Always check memory first
    agentsNeeded.push('memory');
    taskBreakdown.push({
      targetAgent: 'memory',
      task: 'Retrieve relevant context from past conversations',
      priority: 'high',
    });

    // Determine if search is needed
    if (task.includes('find') || task.includes('search') || task.includes('look for')) {
      agentsNeeded.push('search');
      taskBreakdown.push({
        targetAgent: 'search',
        task: `Search project data: ${input.task}`,
        priority: 'high',
        dependencies: ['memory'],
      });
    }

    // Determine if analysis is needed
    if (task.includes('analyze') || task.includes('explain') || task.includes('compare')) {
      agentsNeeded.push('analysis');
      taskBreakdown.push({
        targetAgent: 'analysis',
        task: `Analyze content: ${input.task}`,
        priority: 'medium',
        dependencies: ['search', 'memory'],
      });
    }

    // Always use synthesis to combine results
    agentsNeeded.push('synthesis');
    taskBreakdown.push({
      targetAgent: 'synthesis',
      task: 'Combine and format all findings into a coherent response',
      priority: 'critical',
      dependencies: agentsNeeded.filter(a => a !== 'synthesis'),
    });

    const plan: CoordinatorPlan = {
      strategy: this.determineStrategy(task),
      agentsInvolved: agentsNeeded,
      estimatedSteps: taskBreakdown.length,
      taskBreakdown: taskBreakdown.map(task => ({
        agent: task.targetAgent,
        task: task.task,
        priority: task.priority,
        dependencies: task.dependencies,
      })),
    };

    return plan;
  }

  /**
   * Determine coordination strategy
   */
  private determineStrategy(task: string): string {
    if (task.includes('compare') || task.includes('contrast')) {
      return 'multi-source-comparison';
    } else if (task.includes('analyze')) {
      return 'deep-analysis';
    } else if (task.includes('find') || task.includes('search')) {
      return 'information-retrieval';
    } else {
      return 'general-inquiry';
    }
  }

  /**
   * Retrieve memory context
   */
  private async retrieveMemoryContext(input: AgentInput): Promise<string> {
    const memoryAgent = this.agents.get('memory');
    if (!memoryAgent) return '';

    try {
      const result = await memoryAgent.execute({
        task: 'Get context',
        data: { query: input.task },
      });

      if (result.success && result.result.context) {
        return result.result.context;
      }
    } catch (error) {
      this.log('Failed to retrieve memory context', error);
    }

    return '';
  }

  /**
   * Execute the plan
   */
  private async executePlan(
    plan: CoordinatorPlan,
    input: AgentInput
  ): Promise<Map<AgentType, AgentOutput>> {
    const results = new Map<AgentType, AgentOutput>();

    // Execute tasks respecting dependencies
    for (const task of plan.taskBreakdown) {
      // Skip synthesis for now, will do it last
      if (task.agent === 'synthesis') continue;

      const agent = this.agents.get(task.agent);
      if (!agent) {
        this.log(`Agent ${task.agent} not found`, null);
        continue;
      }

      this.log(`Delegating to ${task.agent} agent`, { task: task.task });

      try {
        // Prepare input for agent
        const agentInput: AgentInput = {
          task: task.task,
          data: input.data,
          context: input.context,
          priority: task.priority,
        };

        const result = await agent.execute(agentInput);
        results.set(task.agent, result);

        this.log(`${task.agent} agent completed`, { success: result.success });
      } catch (error) {
        this.log(`${task.agent} agent failed`, error);
        results.set(task.agent, {
          success: false,
          result: null,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: 0,
          },
        });
      }
    }

    return results;
  }

  /**
   * Synthesize results from all agents
   */
  private async synthesizeResults(
    results: Map<AgentType, AgentOutput>,
    input: AgentInput,
    memoryContext: string
  ): Promise<AgentOutput> {
    const synthesisAgent = this.agents.get('synthesis');
    if (!synthesisAgent) {
      // Fallback: simple concatenation
      const combined = Array.from(results.entries())
        .map(([agent, result]) => `**${agent}:** ${JSON.stringify(result.result)}`)
        .join('\n\n');

      return this.createSuccessOutput({ synthesis: combined });
    }

    // Prepare results for synthesis
    const formattedResults = Array.from(results.entries()).map(([agent, output]) => ({
      agent,
      type: output.success ? 'success' : 'error',
      data: output.result,
      summary: this.summarizeResult(agent, output),
    }));

    try {
      const synthesisInput: AgentInput = {
        task: 'Combine results',
        data: {
          userQuery: input.task,
          results: formattedResults,
          memoryContext,
        },
        context: input.context,
      };

      const synthesis = await synthesisAgent.execute(synthesisInput);
      return synthesis;
    } catch (error) {
      this.log('Synthesis failed', error);

      // Fallback
      return this.createSuccessOutput({
        synthesis: 'Results gathered but synthesis failed',
        rawResults: formattedResults,
      });
    }
  }

  /**
   * Summarize a single result
   */
  private summarizeResult(agent: AgentType, output: AgentOutput): string {
    if (!output.success) {
      return `Failed: ${output.metadata?.error || 'Unknown error'}`;
    }

    switch (agent) {
      case 'search':
        return `Found ${output.result?.found || 0} results`;
      case 'analysis':
        return `Analysis completed for ${output.result?.filename || 'item'}`;
      case 'memory':
        return `Retrieved ${output.result?.found || 0} memories`;
      default:
        return 'Completed';
    }
  }

  /**
   * Store important memories from this interaction
   */
  private async storeMemories(
    input: AgentInput,
    synthesis: AgentOutput,
    results: Map<AgentType, AgentOutput>
  ): Promise<void> {
    const memoryAgent = this.agents.get('memory');
    if (!memoryAgent) return;

    try {
      // Store query pattern
      await memoryAgent.execute({
        task: 'Store memory',
        data: {
          content: `User asked: "${input.task}"`,
          type: 'pattern',
          tags: ['user-query', 'multi-agent'],
          confidence: 0.8,
        },
      });

      // Store successful search results as facts
      const searchResult = results.get('search');
      if (searchResult?.success && searchResult.result?.found > 0) {
        await memoryAgent.execute({
          task: 'Store memory',
          data: {
            content: `Search for "${input.task}" found ${searchResult.result.found} relevant items`,
            type: 'fact',
            tags: ['search-result'],
            confidence: 0.9,
          },
        });
      }
    } catch (error) {
      this.log('Failed to store memories', error);
    }
  }

  /**
   * Delegate task to specific agent
   */
  async delegateTask(agentType: AgentType, task: DelegationTask): Promise<AgentOutput> {
    const agent = this.agents.get(agentType);

    if (!agent) {
      return this.createErrorOutput(`Agent ${agentType} not available`);
    }

    const message = this.createMessage(
      agentType,
      'request',
      task.task,
      task.data,
      task.context,
      task.priority
    );

    const response = await agent.handleMessage(message);

    if (response.type === 'error') {
      return this.createErrorOutput(response.payload.error || 'Task failed');
    }

    return this.createSuccessOutput(response.payload.data);
  }

  async cleanup(): Promise<void> {
    // Cleanup all agents
    for (const agent of this.agents.values()) {
      await agent.cleanup();
    }

    this.agents.clear();
    this.taskResults.clear();

    await super.cleanup();
  }
}

