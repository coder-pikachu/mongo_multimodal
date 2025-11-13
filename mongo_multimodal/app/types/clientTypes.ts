export interface ClientUser {
  _id: string;
  email: string;
  name: string;
  projects: string[];
}

export interface ClientProject {
  _id: string;
  name: string;
  description: string;
  userId: string;
  sampleQuestions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProjectData {
  _id: string;
  projectId: string;
  type: 'image' | 'document' | 'text_chunk' | 'web_chunk';
  content: {
    base64?: string; // for images
    text?: string;   // for documents and chunks
  };
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
    chunkInfo?: {
      chunkIndex: number;
      totalChunks: number;
      parentId?: string;
      sourceUrl?: string;
      originalFilename?: string;
      csvMetadata?: {
        rowStart: number;
        rowEnd: number;
        columns: string[];
      };
    };
  };
  analysis?: {
    description: string;
    tags: string[];
    insights: string[];
  };
  embedding?: number[]; // 1024-dimensional vector
  score?: number; // Similarity score from vector search
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult extends Omit<ClientProjectData, 'embedding'> {
  score: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface AgentPlan {
  steps: string[];
  estimatedToolCalls: number;
  rationale: string;
  needsExternalData: boolean;
  toolsToUse: string[];
}

export interface ToolExecution {
  step: number;
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
  duration: number;
  tokens?: number;
  timestamp: Date;
}

export interface ConversationReference {
  type: 'projectData' | 'web' | 'email';
  dataId?: string; // For projectData
  url?: string; // For web
  title: string;
  usedInStep: number;
  toolCall: string;
  score?: number; // For search results
}

export interface ConversationMessage {
  _id: string;
  projectId: string;
  sessionId: string;
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
  timestamp: Date;
  contentCleaned?: boolean;
  plan?: AgentPlan;
  references?: ConversationReference[];
  toolExecutions?: ToolExecution[];
}
