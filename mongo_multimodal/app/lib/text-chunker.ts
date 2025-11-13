/**
 * Text Chunking Utilities
 * Handles semantic chunking of text, CSV, and JSON files
 */

export interface TextChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  metadata: {
    charStart: number;
    charEnd: number;
    estimatedTokens: number;
    type: 'paragraph' | 'csv_rows' | 'json_section';
    originalFilename?: string;
    sourceType?: 'file' | 'web';
    rowStart?: number; // for CSV
    rowEnd?: number; // for CSV
    columns?: string[]; // for CSV
    csvMetadata?: {
      rowStart: number;
      rowEnd: number;
      columns: string[];
    };
  };
}

export interface ChunkOptions {
  maxTokens?: number; // default 2000
  overlapTokens?: number; // default 200
  minChunkSize?: number; // default 100 tokens
}

export interface CSVChunkOptions extends ChunkOptions {
  rowsPerChunk?: number; // default 50-100 depending on row size
}

/**
 * Estimate token count from text using simple heuristic
 * ~4 characters per token on average
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Semantic chunking of plain text
 * Splits by paragraphs, groups until max tokens, preserves sentence boundaries
 */
export function chunkText(
  text: string,
  filename?: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const {
    maxTokens = 2000,
    overlapTokens = 200,
    minChunkSize = 100
  } = options;

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  if (paragraphs.length === 0) {
    return [];
  }

  const chunks: Omit<TextChunk, 'totalChunks'>[] = [];
  let currentChunk = '';
  let currentTokens = 0;
  let charStart = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = estimateTokens(para);

    // If single paragraph exceeds maxTokens, split by sentences
    if (paraTokens > maxTokens) {
      // Flush current chunk if it has content
      if (currentChunk.trim().length > 0 && currentTokens >= minChunkSize) {
        chunks.push(createChunk(
          currentChunk.trim(),
          chunkIndex,
          charStart,
          filename
        ));
        chunkIndex++;

        // Add overlap: last 200 tokens of previous chunk becomes start of next
        const overlapStart = Math.max(0, currentChunk.length - (overlapTokens * 4));
        currentChunk = currentChunk.substring(overlapStart);
        currentTokens = estimateTokens(currentChunk);
        charStart += currentChunk.length;
      }

      // Split large paragraph by sentences
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let sentenceChunk = '';
      let sentenceTokens = 0;

      for (const sentence of sentences) {
        const sentenceSize = estimateTokens(sentence);
        if (sentenceTokens + sentenceSize > maxTokens && sentenceChunk.trim().length > 0) {
          chunks.push(createChunk(
            sentenceChunk.trim(),
            chunkIndex,
            charStart,
            filename
          ));
          chunkIndex++;

          // Add overlap
          const overlapStart = Math.max(0, sentenceChunk.length - (overlapTokens * 4));
          sentenceChunk = sentenceChunk.substring(overlapStart);
          sentenceTokens = estimateTokens(sentenceChunk);
          charStart += sentenceChunk.length;
        }

        sentenceChunk += sentence;
        sentenceTokens += sentenceSize;
      }

      if (sentenceChunk.trim().length > 0) {
        currentChunk = sentenceChunk;
        currentTokens = sentenceTokens;
      }
    } else if (currentTokens + paraTokens <= maxTokens) {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
      currentTokens += paraTokens;
    } else {
      // Current chunk is full, save and start new one
      if (currentChunk.trim().length > 0 && currentTokens >= minChunkSize) {
        chunks.push(createChunk(
          currentChunk.trim(),
          chunkIndex,
          charStart,
          filename
        ));
        chunkIndex++;

        // Add overlap: last 200 tokens become start of next chunk
        const overlapStart = Math.max(0, currentChunk.length - (overlapTokens * 4));
        currentChunk = currentChunk.substring(overlapStart) + '\n\n' + para;
        currentTokens = estimateTokens(currentChunk);
        charStart += currentChunk.length - para.length;
      } else {
        currentChunk = para;
        currentTokens = paraTokens;
      }
    }
  }

  // Save final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(
      currentChunk.trim(),
      chunkIndex,
      charStart,
      filename
    ));
  }

  // Update totalChunks in all chunks
  return chunks.map((chunk) => ({
    ...chunk,
    totalChunks: chunks.length,
  }));
}

/**
 * Parse CSV and create chunks by row groups
 * Includes header in each chunk for context
 */
export function chunkCSV(
  csvContent: string,
  filename?: string,
  options: CSVChunkOptions = {}
): TextChunk[] {
  const { rowsPerChunk = 100 } = options;
  const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = lines[0];
  const headerTokens = estimateTokens(header);
  const columns = parseCSVLine(header);

  // Adjust rows per chunk based on content size
  let actualRowsPerChunk = rowsPerChunk;
  if (lines.length > 1) {
    const sampleRow = lines[1];
    const rowTokens = estimateTokens(sampleRow);
    // Aim for ~2000 tokens per chunk (header + rows)
    actualRowsPerChunk = Math.max(10, Math.floor((2000 - headerTokens) / rowTokens));
  }

  const chunks: Omit<TextChunk, 'totalChunks'>[] = [];
  let chunkIndex = 0;
  let charStart = 0;

  for (let i = 1; i < lines.length; i += actualRowsPerChunk) {
    const endIdx = Math.min(i + actualRowsPerChunk, lines.length);
    const chunkLines = [header, ...lines.slice(i, endIdx)];
    const chunkContent = chunkLines.join('\n');

    chunks.push({
      content: chunkContent,
      chunkIndex,
      metadata: {
        charStart,
        charEnd: charStart + chunkContent.length,
        estimatedTokens: estimateTokens(chunkContent),
        type: 'csv_rows',
        originalFilename: filename,
        sourceType: 'file',
        rowStart: i,
        rowEnd: endIdx,
        columns,
      },
    });

    charStart += chunkContent.length;
    chunkIndex++;
  }

  // Update totalChunks
  return chunks.map((chunk) => ({
    ...chunk,
    totalChunks: chunks.length,
  }));
}

/**
 * Flatten JSON and chunk the result
 * Converts JSON to readable text format
 */
export function chunkJSON(
  jsonContent: string,
  filename?: string,
  options: ChunkOptions = {}
): TextChunk[] {
  try {
    const parsed = JSON.parse(jsonContent);
    const flattened = flattenJSON(parsed);
    return chunkText(flattened, filename, { ...options });
  } catch {
    // If parsing fails, treat as plain text
    return chunkText(jsonContent, filename, options);
  }
}

/**
 * Detect file type and apply appropriate chunking
 */
export function chunkFileContent(
  content: string,
  filename: string,
  mimeType: string
): TextChunk[] {
  // Detect by MIME type or filename extension
  if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
    return chunkCSV(content, filename);
  } else if (mimeType === 'application/json' || filename.endsWith('.json')) {
    return chunkJSON(content, filename);
  } else {
    // Default to text chunking
    return chunkText(content, filename);
  }
}

/**
 * Helper: Create a TextChunk object
 */
function createChunk(
  content: string,
  chunkIndex: number,
  charStart: number,
  filename?: string
): Omit<TextChunk, 'totalChunks'> {
  return {
    content,
    chunkIndex,
    metadata: {
      charStart,
      charEnd: charStart + content.length,
      estimatedTokens: estimateTokens(content),
      type: 'paragraph',
      originalFilename: filename,
      sourceType: 'file',
    },
  };
}

/**
 * Helper: Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Helper: Flatten JSON to readable text
 */
function flattenJSON(
  obj: any,
  prefix = '',
  depth = 0
): string {
  const maxDepth = 5;
  const lines: string[] = [];

  if (depth > maxDepth) {
    return '[max depth exceeded]';
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    // For arrays, show each item
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (typeof item === 'object' && item !== null) {
        lines.push(`${prefix}[${i}]:`);
        lines.push(flattenJSON(item, prefix + '  ', depth + 1));
      } else {
        lines.push(`${prefix}[${i}]: ${item}`);
      }
    }
    return lines.join('\n');
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        lines.push(`${newPrefix}:`);
        lines.push(flattenJSON(value, newPrefix, depth + 1));
      } else {
        lines.push(`${newPrefix}: ${value}`);
      }
    }
    return lines.join('\n');
  }

  return String(obj);
}
