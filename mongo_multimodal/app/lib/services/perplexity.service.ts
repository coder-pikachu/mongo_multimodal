/**
 * Perplexity AI Search Service
 * Provides web search capabilities using Perplexity API
 */

export interface PerplexitySearchResult {
  answer: string;
  citations: string[];
  followupQuestions?: string[];
  images?: string[];
}

export interface PerplexityApiResponse {
  id: string;
  model: string;
  created: number;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
  object: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * Search the web using Perplexity API
 * @param query - Search query
 * @param options - Optional search configuration
 * @returns Search results with citations
 */
export async function searchWeb(
  query: string,
  options?: {
    model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning';
    maxTokens?: number;
    temperature?: number;
  }
): Promise<PerplexitySearchResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured');
  }

  // Use 'sonar' as the fastest, lightweight model for grounded search
  const model = options?.model || 'sonar';
  const maxTokens = options?.maxTokens || 1024;
  const temperature = options?.temperature || 0.2;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Be precise and concise. Provide factual information with sources.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: maxTokens,
        temperature,
        return_citations: true,
        return_images: false,
        search_recency_filter: 'month', // Focus on recent information
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
    }

    const data: PerplexityApiResponse = await response.json();

    // Extract the answer from the response
    const answer = data.choices?.[0]?.message?.content || 'No answer returned';
    const citations = data.citations || [];

    return {
      answer,
      citations,
    };
  } catch (error) {
    console.error('Perplexity search error:', error);
    throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if Perplexity API is configured and available
 */
export function isPerplexityEnabled(): boolean {
  return !!process.env.PERPLEXITY_API_KEY && process.env.AGENT_WEB_SEARCH_ENABLED !== 'false';
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Search query cannot be empty' };
  }

  if (query.length > 1000) {
    return { valid: false, error: 'Search query too long (max 1000 characters)' };
  }

  return { valid: true };
}
