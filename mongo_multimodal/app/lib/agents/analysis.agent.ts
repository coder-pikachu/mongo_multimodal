/**
 * Analysis Agent
 * Specialized agent for deep content analysis and data extraction
 */

import { Agent } from './base.agent';
import { AgentInput, AgentOutput } from '@/types/agent.types';
import { compressImage, estimateImageTokens } from '@/lib/image-utils';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { ObjectId } from 'mongodb';

export class AnalysisAgent extends Agent {
  constructor() {
    super('analysis');
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log('Executing analysis task', { task: input.task });
    this.status = 'executing';

    try {
      const task = input.task.toLowerCase();

      if (task.includes('image') || task.includes('visual') || input.data?.type === 'image') {
        return await this.analyzeImage(input);
      } else if (task.includes('compare') || task.includes('comparison')) {
        return await this.compareItems(input);
      } else if (task.includes('stored') || task.includes('cached')) {
        return await this.getStoredAnalysis(input);
      } else {
        // Default: analyze image if dataId provided
        return await this.analyzeImage(input);
      }
    } catch (error) {
      this.log('Analysis error', error);
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Analysis failed'
      );
    }
  }

  /**
   * Analyze a single image with context
   */
  private async analyzeImage(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const dataId = input.data?.dataId || input.data?.id;
    const focusQuery = input.data?.focusQuery || input.context || context.userQuery;

    if (!dataId) {
      return this.createErrorOutput('No dataId provided for image analysis');
    }

    this.log('Analyzing image', { dataId, focusQuery });

    try {
      // Fetch the image
      let projectData = await db.collection('projectData').findOne({
        _id: new ObjectId(dataId),
        projectId: new ObjectId(context.projectId),
        type: 'image',
      });

      if (!projectData) {
        projectData = await db.collection('projectData').findOne({
          _id: new ObjectId(dataId),
          type: 'image',
        });
      }

      if (!projectData || !projectData.content?.base64) {
        return this.createErrorOutput('Image not found or invalid');
      }

      // Compress image
      const compressed = await compressImage(
        projectData.content.base64,
        projectData.metadata?.mimeType || 'image/jpeg'
      );

      const estimatedTokens = estimateImageTokens(compressed.base64);

      // Build analysis prompt
      let analysisPrompt = `Analyze this image "${projectData.metadata?.filename || 'Unknown'}"`;

      if (context.projectName || context.projectDescription) {
        analysisPrompt += `\n\n**Project Context:**`;
        if (context.projectName) analysisPrompt += `\n- Project: ${context.projectName}`;
        if (context.projectDescription) analysisPrompt += `\n- Description: ${context.projectDescription}`;
      }

      if (focusQuery) {
        analysisPrompt += `\n\n**Focus Area:** "${focusQuery}"`;
        analysisPrompt += `\nConcentrate your analysis specifically on elements related to this query.`;
      }

      analysisPrompt += `\n\n**Analysis Instructions:**
- Extract key insights directly relevant to the focus area and project context
- Identify specific technical details, measurements, or specifications if visible
- Highlight any issues, recommendations, or notable observations
- If the image contains text, extract and summarize key information
- Be concise and actionable`;

      const selectedProvider = (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

      // Analyze with LLM
      const analysisResult = await streamText({
        model: selectedProvider === 'claude'
          ? anthropic('claude-haiku-4-5-20251001')
          : openai('gpt-5-nano-2025-08-07'),
        maxOutputTokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt,
              },
              {
                type: 'image' as const,
                image: new URL(`data:${projectData.metadata?.mimeType || 'image/jpeg'};base64,${compressed.base64}`),
              },
            ],
          },
        ],
      });

      // Get complete response
      let fullResponse = '';
      const reader = analysisResult.toTextStreamResponse().body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value);
        }
      }

      return this.createSuccessOutput({
        dataId,
        filename: projectData.metadata?.filename,
        analysis: fullResponse || 'Analysis failed',
        existingAnalysis: projectData.analysis,
        metadata: {
          originalSizeKB: compressed.originalSizeKB,
          compressedSizeKB: compressed.sizeKB,
          estimatedTokens,
        },
      }, {
        tokensUsed: estimatedTokens,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Image analysis failed'
      );
    }
  }

  /**
   * Get stored analysis without re-analyzing
   */
  private async getStoredAnalysis(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const dataId = input.data?.dataId || input.data?.id;

    if (!dataId) {
      return this.createErrorOutput('No dataId provided');
    }

    this.log('Fetching stored analysis', { dataId });

    try {
      let doc = await db.collection('projectData').findOne(
        {
          _id: new ObjectId(dataId),
          projectId: new ObjectId(context.projectId),
        },
        { projection: { content: 0 } }
      );

      if (!doc) {
        doc = await db.collection('projectData').findOne(
          { _id: new ObjectId(dataId) },
          { projection: { content: 0 } }
        );
      }

      if (!doc) {
        return this.createErrorOutput('Item not found');
      }

      return this.createSuccessOutput({
        id: doc._id.toString(),
        type: doc.type,
        filename: doc.metadata?.filename,
        metadata: {
          mimeType: doc.metadata?.mimeType,
          size: doc.metadata?.size,
        },
        analysis: doc.analysis || {
          description: 'No analysis available',
          tags: [],
          insights: [],
          facets: {},
        },
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Failed to fetch stored analysis'
      );
    }
  }

  /**
   * Compare multiple items
   */
  private async compareItems(input: AgentInput): Promise<AgentOutput> {
    const dataIds = input.data?.dataIds || [];

    if (dataIds.length < 2) {
      return this.createErrorOutput('Need at least 2 items to compare');
    }

    this.log('Comparing items', { count: dataIds.length });

    const analyses = [];

    // Get stored analysis for each item
    for (const dataId of dataIds) {
      const result = await this.getStoredAnalysis({
        task: 'get stored analysis',
        data: { dataId },
      });

      if (result.success) {
        analyses.push(result.result);
      }
    }

    if (analyses.length === 0) {
      return this.createErrorOutput('No analyses found for comparison');
    }

    // Perform comparison
    const comparison = {
      itemCount: analyses.length,
      items: analyses.map(a => ({
        id: a.id,
        filename: a.filename,
        description: a.analysis?.description,
        tags: a.analysis?.tags || [],
      })),
      commonTags: this.findCommonTags(analyses),
      differences: this.findDifferences(analyses),
    };

    return this.createSuccessOutput(comparison);
  }

  /**
   * Find common tags across analyses
   */
  private findCommonTags(analyses: any[]): string[] {
    if (analyses.length === 0) return [];

    const tagSets = analyses.map(a => new Set<string>(a.analysis?.tags || []));
    const firstSet = tagSets[0];

    return Array.from(firstSet).filter((tag: string) =>
      tagSets.every(set => set.has(tag))
    );
  }

  /**
   * Find differences between analyses
   */
  private findDifferences(analyses: any[]): any {
    // Simple difference detection
    const uniqueTags = new Map<string, string[]>();

    analyses.forEach(a => {
      const tags = a.analysis?.tags || [];
      tags.forEach((tag: string) => {
        if (!uniqueTags.has(tag)) {
          uniqueTags.set(tag, []);
        }
        uniqueTags.get(tag)?.push(a.filename);
      });
    });

    return {
      uniqueToItems: Array.from(uniqueTags.entries())
        .filter(([_, files]) => files.length === 1)
        .map(([tag, files]) => ({ tag, file: files[0] })),
    };
  }
}

