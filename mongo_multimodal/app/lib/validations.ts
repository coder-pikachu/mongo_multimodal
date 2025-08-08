import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  projects: z.array(z.string()),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  userId: z.string(),
  sampleQuestions: z.array(z.string().min(1).max(200)).max(5).optional(),
});

export const projectDataSchema = z.object({
  projectId: z.string(),
  type: z.enum(['image', 'document']),
  content: z.object({
    base64: z.string().optional(),
    text: z.string().optional(),
  }).refine(data => data.base64 || data.text, {
    message: "Either base64 or text must be provided"
  }),
  metadata: z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().positive(),
  }),
  analysis: z.object({
    description: z.string(),
    tags: z.array(z.string()),
    insights: z.array(z.string()),
  }),
  // Embedding is optional at creation time; will be added during processing
  embedding: z.array(z.number()).length(1024).optional(),
});

export type CreateUserInput = z.infer<typeof userSchema>;
export type CreateProjectInput = z.infer<typeof projectSchema>;
export type CreateProjectDataInput = z.infer<typeof projectDataSchema>;
