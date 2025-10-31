/**
 * Utility functions
 * NOTE: Vector search functions have been moved to services/vectorSearch.service.ts
 * This file now re-exports them for backward compatibility
 */

import { Db } from 'mongodb';
import {
  paginatedVectorSearch,
  vectorSearchWithAnalysis
} from './services/vectorSearch.service';

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  // Parse the date if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use ISO format for consistency between server and client
  return dateObj.toISOString().split('T')[0];
}

// Re-export for backward compatibility
export const doPaginatedVectorSearch = paginatedVectorSearch;

// Re-export for backward compatibility
export async function doVectorSearchAndAnalyse(
  type: 'text' | 'image',
  query: string,
  db: Db,
  paramsFound?: { projectId: string },
  provider?: 'claude' | 'openai'
) {
  return vectorSearchWithAnalysis(
    db,
    query,
    type,
    paramsFound?.projectId,
    provider
  );
}