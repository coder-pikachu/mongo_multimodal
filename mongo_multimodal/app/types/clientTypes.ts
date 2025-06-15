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
  createdAt: Date;
  updatedAt: Date;
}
