/**
 * Synthesis Agent
 * Specialized agent for combining and synthesizing results from multiple agents
 */

import { Agent } from './base.agent';
import { AgentInput, AgentOutput } from '@/types/agent.types';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export class SynthesisAgent extends Agent {
  constructor() {
    super('synthesis');
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log('Executing synthesis task', { task: input.task });
    this.status = 'executing';

    try {
      const task = input.task.toLowerCase();

      if (task.includes('report') || task.includes('document')) {
        return await this.generateReport(input);
      } else if (task.includes('summary') || task.includes('summarize')) {
        return await this.generateSummary(input);
      } else if (task.includes('comparison') || task.includes('compare')) {
        return await this.synthesizeComparison(input);
      } else {
        // Default: combine results
        return await this.combineResults(input);
      }
    } catch (error) {
      this.log('Synthesis error', error);
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Synthesis failed'
      );
    }
  }

  /**
   * Combine results from multiple agents
   */
  private async combineResults(input: AgentInput): Promise<AgentOutput> {
    const results = input.data?.results || [];
    const userQuery = input.data?.userQuery || input.context;

    if (results.length === 0) {
      return this.createErrorOutput('No results provided for synthesis');
    }

    this.log('Combining results', { count: results.length });

    try {
      // Build synthesis prompt
      const prompt = this.buildSynthesisPrompt(userQuery, results);

      // Use LLM to synthesize
      const synthesized = await this.generateWithLLM(prompt);

      return this.createSuccessOutput({
        synthesis: synthesized,
        sourceCount: results.length,
        sources: results.map((r: any) => ({
          agent: r.agent,
          type: r.type,
          summary: r.summary || 'No summary',
        })),
      }, {
        tokensUsed: this.estimateTokens(synthesized),
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Failed to combine results'
      );
    }
  }

  /**
   * Generate a comprehensive summary
   */
  private async generateSummary(input: AgentInput): Promise<AgentOutput> {
    const content = input.data?.content || '';
    const maxLength = input.data?.maxLength || 500;

    if (!content) {
      return this.createErrorOutput('No content provided for summarization');
    }

    this.log('Generating summary', { contentLength: content.length, maxLength });

    try {
      const prompt = `Summarize the following content in a concise and informative way (max ${maxLength} words):

${content}

Provide a clear, well-structured summary that captures the key points.`;

      const summary = await this.generateWithLLM(prompt);

      return this.createSuccessOutput({
        summary,
        originalLength: content.length,
        summaryLength: summary.length,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Summarization failed'
      );
    }
  }

  /**
   * Generate a detailed report
   */
  private async generateReport(input: AgentInput): Promise<AgentOutput> {
    const data = input.data?.data || {};
    const title = input.data?.title || 'Analysis Report';
    const format = input.data?.format || 'markdown';

    this.log('Generating report', { title, format });

    try {
      const prompt = this.buildReportPrompt(title, data, format);
      const report = await this.generateWithLLM(prompt);

      return this.createSuccessOutput({
        title,
        format,
        report,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Report generation failed'
      );
    }
  }

  /**
   * Synthesize a comparison
   */
  private async synthesizeComparison(input: AgentInput): Promise<AgentOutput> {
    const items = input.data?.items || [];

    if (items.length < 2) {
      return this.createErrorOutput('Need at least 2 items to compare');
    }

    this.log('Synthesizing comparison', { count: items.length });

    try {
      const prompt = `Compare and contrast the following items:

${items.map((item: any, idx: number) => `
**Item ${idx + 1}: ${item.name || 'Unknown'}**
${JSON.stringify(item.data, null, 2)}
`).join('\n')}

Provide a detailed comparison highlighting:
1. Key similarities
2. Notable differences
3. Unique characteristics of each item
4. Recommendations or insights based on the comparison`;

      const comparison = await this.generateWithLLM(prompt);

      return this.createSuccessOutput({
        comparison,
        itemCount: items.length,
        items: items.map((i: any) => i.name || 'Unknown'),
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Comparison synthesis failed'
      );
    }
  }

  /**
   * Build synthesis prompt
   */
  private buildSynthesisPrompt(userQuery: string, results: any[]): string {
    let prompt = `Based on the following information gathered from multiple specialized agents, provide a comprehensive and well-structured answer to the user's query.

**User Query:** ${userQuery}

**Information Gathered:**

`;

    results.forEach((result, idx) => {
      prompt += `\n### Source ${idx + 1} (${result.agent || 'Unknown'} Agent):\n`;

      if (typeof result.data === 'string') {
        prompt += result.data;
      } else {
        prompt += JSON.stringify(result.data, null, 2);
      }

      prompt += '\n';
    });

    prompt += `\n**Instructions:**
1. Synthesize all the information into a coherent, well-formatted response
2. Use markdown formatting with headers, bullets, and emphasis where appropriate
3. Cite specific sources when presenting information
4. If there are contradictions, acknowledge them
5. Provide actionable insights or conclusions
6. Keep the response focused on answering the user's query

Generate a comprehensive response now:`;

    return prompt;
  }

  /**
   * Build report prompt
   */
  private buildReportPrompt(title: string, data: any, format: string): string {
    return `Generate a professional ${format} report with the title "${title}".

**Data to include:**
${JSON.stringify(data, null, 2)}

**Requirements:**
1. Start with an executive summary
2. Organize content into clear sections
3. Include relevant data points and statistics
4. Provide analysis and insights
5. End with conclusions and recommendations
6. Use proper ${format} formatting

Generate the report now:`;
  }

  /**
   * Generate text using LLM
   */
  private async generateWithLLM(prompt: string): Promise<string> {
    const selectedProvider = (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

    const result = await streamText({
      model: selectedProvider === 'claude'
        ? anthropic('claude-haiku-4-5-20251001')
        : openai('gpt-5-nano-2025-08-07'),
      maxOutputTokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Get complete response
    let fullResponse = '';
    const reader = result.toTextStreamResponse().body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value);
      }
    }

    return fullResponse;
  }

  /**
   * Estimate tokens in text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Format results as markdown
   */
  private formatAsMarkdown(results: any[]): string {
    let markdown = '# Synthesized Results\n\n';

    results.forEach((result, idx) => {
      markdown += `## Result ${idx + 1}\n\n`;
      markdown += `**Source:** ${result.agent || 'Unknown'}\n\n`;

      if (result.data) {
        markdown += '```json\n';
        markdown += JSON.stringify(result.data, null, 2);
        markdown += '\n```\n\n';
      }
    });

    return markdown;
  }
}

