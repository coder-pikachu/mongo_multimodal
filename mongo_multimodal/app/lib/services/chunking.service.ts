/**
 * Chunking Service
 * Handles text file chunking, web scraping, and memory extraction
 */

import { Db, ObjectId } from 'mongodb';
import { chunkFileContent, TextChunk } from '../text-chunker';
import { scrapeWebsite, validateURL, normalizeURL } from '../web-scraper';
import { storeMemory } from './memory.service';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export interface ChunkUploadResult {
  success: boolean;
  insertedIds: ObjectId[];
  totalChunks: number;
  memoriesCreated?: number;
  error?: string;
}

/**
 * Get the selected LLM provider from environment
 */
function getSelectedProvider(): 'claude' | 'openai' {
  return (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';
}

/**
 * Get the appropriate model based on provider
 */
function getModel(provider: 'claude' | 'openai') {
  if (provider === 'claude') {
    return anthropic('claude-haiku-4-5-20251001');
  }
  return openai('gpt-5-nano-2025-08-07');
}

/**
 * Check if memory system is enabled
 */
function isMemoryEnabled(): boolean {
  return process.env.AGENT_MEMORY_ENABLED !== 'false';
}

/**
 * Process and upload text file with chunking
 */
export async function processAndUploadTextFile(
  db: Db,
  projectId: string,
  file: File,
  sessionId?: string
): Promise<ChunkUploadResult> {
  try {
    // Read file content
    const fileContent = await file.text();

    // Detect type and chunk accordingly
    const chunks = chunkFileContent(fileContent, file.name, file.type);

    if (chunks.length === 0) {
      return {
        success: false,
        insertedIds: [],
        totalChunks: 0,
        error: 'No content could be extracted from file',
      };
    }

    // Create projectData documents for each chunk
    const parentId = new ObjectId();
    const insertedIds: ObjectId[] = [];

    for (const chunk of chunks) {
      const projectData = {
        projectId: new ObjectId(projectId),
        type: 'text_chunk',
        content: {
          text: chunk.content,
        },
        metadata: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          chunkInfo: {
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            parentId,
            originalFilename: file.name,
            csvMetadata: chunk.metadata.csvMetadata,
          },
        },
        analysis: {
          description: '',
          tags: [],
          insights: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('projectData').insertOne(projectData);
      insertedIds.push(result.insertedId);
    }

    // Extract memories from chunks if enabled
    let memoriesCreated = 0;
    if (isMemoryEnabled() && sessionId) {
      memoriesCreated = await extractMemoriesFromChunks(
        db,
        projectId,
        chunks,
        sessionId,
        file.name
      );
    }

    return {
      success: true,
      insertedIds,
      totalChunks: chunks.length,
      memoriesCreated,
    };
  } catch (error) {
    return {
      success: false,
      insertedIds: [],
      totalChunks: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process and upload web content with chunking
 */
export async function processAndUploadWebContent(
  db: Db,
  projectId: string,
  url: string,
  sessionId?: string
): Promise<ChunkUploadResult> {
  try {
    // Validate and normalize URL
    const normalizedUrl = normalizeURL(url);
    if (!validateURL(normalizedUrl)) {
      return {
        success: false,
        insertedIds: [],
        totalChunks: 0,
        error: 'Invalid URL format',
      };
    }

    // Scrape website
    const scraped = await scrapeWebsite(normalizedUrl);

    if (!scraped.success || !scraped.text || scraped.text.length < 50) {
      return {
        success: false,
        insertedIds: [],
        totalChunks: 0,
        error: scraped.error || 'Could not extract content from website',
      };
    }

    // Chunk the content
    const chunks = chunkFileContent(
      scraped.text,
      scraped.title || 'web-page',
      'text/plain'
    );

    if (chunks.length === 0) {
      return {
        success: false,
        insertedIds: [],
        totalChunks: 0,
        error: 'No content could be extracted from website',
      };
    }

    // Create projectData documents for each chunk
    const parentId = new ObjectId();
    const insertedIds: ObjectId[] = [];

    for (const chunk of chunks) {
      const projectData = {
        projectId: new ObjectId(projectId),
        type: 'web_chunk',
        content: {
          text: chunk.content,
        },
        metadata: {
          filename: scraped.title || url,
          mimeType: 'text/html',
          size: scraped.text.length,
          chunkInfo: {
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            parentId,
            sourceUrl: normalizedUrl,
            originalFilename: scraped.title,
          },
        },
        analysis: {
          description: scraped.metadata.description || '',
          tags: ['web-content', scraped.metadata.author ? 'authored' : ''].filter(Boolean),
          insights: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('projectData').insertOne(projectData);
      insertedIds.push(result.insertedId);
    }

    // Extract memories from chunks if enabled
    let memoriesCreated = 0;
    if (isMemoryEnabled() && sessionId) {
      memoriesCreated = await extractMemoriesFromChunks(
        db,
        projectId,
        chunks,
        sessionId,
        scraped.title || url,
        'web'
      );
    }

    return {
      success: true,
      insertedIds,
      totalChunks: chunks.length,
      memoriesCreated,
    };
  } catch (error) {
    return {
      success: false,
      insertedIds: [],
      totalChunks: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract memories from uploaded chunks
 * Uses Claude/OpenAI to identify key facts and stores as memories
 */
export async function extractMemoriesFromChunks(
  db: Db,
  projectId: string,
  chunks: TextChunk[],
  sessionId: string,
  sourceFilename: string,
  sourceType: 'file' | 'web' = 'file'
): Promise<number> {
  try {
    const provider = getSelectedProvider();
    const model = getModel(provider);

    let memoriesCreated = 0;

    // Process first 3 chunks for memory extraction (to avoid excessive API calls)
    const chunksToProcess = chunks.slice(0, Math.min(3, chunks.length));

    for (const chunk of chunksToProcess) {
      try {
        // Generate extraction prompt
        const prompt = `Analyze this text chunk and extract 2-3 key facts or insights that would be valuable for future agent queries.
Each fact should be:
- Standalone (understandable without full context)
- Specific and actionable
- Relevant to the project

Text chunk:
${chunk.content.substring(0, 1000)}

Return a JSON array with objects containing "fact" (string) and "confidence" (0-1 number):
[{"fact": "...", "confidence": 0.85}]`;

        const result = await streamText({
          model,
          maxOutputTokens: 512,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        let full = '';
        const reader = result.toTextStreamResponse().body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            full += decoder.decode(value);
          }
        }

        // Parse JSON response
        let facts: Array<{ fact: string; confidence: number }> = [];
        try {
          // Extract JSON from response
          const jsonMatch = full.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            facts = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // If parsing fails, skip this chunk
          continue;
        }

        // Store each fact as a memory
        for (const { fact, confidence } of facts) {
          try {
            await storeMemory(db, {
              projectId,
              sessionId,
              type: 'fact',
              content: fact,
              source: `chunk_upload_${sourceFilename}`,
              confidence: Math.min(confidence * 0.9, 0.9), // Slightly reduce to allow enrichment
              tags: ['chunk-upload', 'auto-extracted', sourceType],
            });
            memoriesCreated++;
          } catch (memoryError) {
            console.error('Error storing memory:', memoryError);
          }
        }
      } catch (chunkError) {
        console.error('Error extracting memories from chunk:', chunkError);
        // Continue to next chunk on error
      }
    }

    return memoriesCreated;
  } catch (error) {
    console.error('Error extracting memories:', error);
    return 0;
  }
}
