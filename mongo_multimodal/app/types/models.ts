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
  createdAt: Date;
  updatedAt: Date;
}
