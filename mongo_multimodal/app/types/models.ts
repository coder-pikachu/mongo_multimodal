import { ObjectId } from 'mongodb';

export interface User {
  _id: ObjectId;
  email: string;
  name: string;
  projects: ObjectId[];
}

export interface Project {
  _id: ObjectId;
  name: string;
  description: string;
  userId: ObjectId;
  sampleQuestions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectData {
  _id: ObjectId;
  projectId: ObjectId;
  type: 'image' | 'document';
  content: {
    base64?: string; // for images
    text?: string;   // for documents
  };
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
  };
  analysis: {
    description: string;
    tags: string[];
    insights: string[];
  };
  embedding: number[]; // 1024-dimensional vector
  referencedBy?: Reference[]; // Track where this data was used
  createdAt: Date;
  updatedAt: Date;
}

export interface Reference {
  conversationId: ObjectId;
  sessionId: string;
  timestamp: Date;
  context: string; // What question it helped answer
  toolCall: string; // Which tool used it
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
  dataId?: ObjectId; // For projectData
  url?: string; // For web
  title: string;
  usedInStep: number;
  toolCall: string;
  score?: number; // For search results
}

export interface Conversation {
  _id: ObjectId;
  projectId: string;
  sessionId: string;
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
  timestamp: Date;
  contentCleaned?: boolean;
  plan?: AgentPlan; // Agent's plan for user query
  references?: ConversationReference[]; // Sources used
  toolExecutions?: ToolExecution[]; // Detailed tool usage tracking
}
