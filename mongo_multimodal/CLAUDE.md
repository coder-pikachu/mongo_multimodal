# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a MongoDB Multimodal Vector Search application built with Next.js 15, TypeScript, and MongoDB Atlas. It processes multimodal data (images and documents) using AI services (Claude and VoyageAI) to generate vector embeddings for semantic search capabilities.

## Essential Commands

```bash
# Development
npm run dev          # Start development server with Turbopack on localhost:3000

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database Operations
npm run test:db      # Test MongoDB connection
npm run create:index # Create vector search indexes in MongoDB

# Code Quality
npm run lint         # Run ESLint with Next.js rules
```

## Architecture Overview

### Core Technologies
- **Frontend**: Next.js 15.1.7 with App Router, React 19, TypeScript
- **Database**: MongoDB 6.3.0 with Atlas Vector Search
- **AI Services**:
  - Anthropic Claude SDK for image analysis
  - VoyageAI for generating vector embeddings
  - OpenAI API support (configurable via LLM_FOR_ANALYSIS)
- **Styling**: TailwindCSS with PostCSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation

### Project Structure
```
/app/                    # Next.js App Router
├── api/                 # API routes for backend operations
│   ├── projects/       # CRUD operations for projects
│   ├── search/         # Text search endpoints
│   ├── vector-search/  # Vector similarity search
│   └── ask-question/   # Q&A interface for project data
├── lib/                # Core utilities and integrations
│   ├── mongodb.ts      # MongoDB connection and client
│   ├── claude.ts       # Claude AI integration for image analysis
│   ├── voyageai.ts     # VoyageAI embedding generation
│   └── utils.ts        # Shared helper functions
├── components/         # Reusable React components
├── projects/           # Project-related pages
├── types/             # TypeScript type definitions
└── scripts/           # Database utility scripts
```

### Key Patterns and Conventions

1. **API Routes**: All backend endpoints use Next.js API routes in `/app/api/`
2. **Database Access**: MongoDB connections are managed through `/app/lib/mongodb.ts` with connection pooling
3. **Vector Processing Pipeline**:
   - Files are uploaded and processed in `/app/api/projects/[id]/upload/`
   - Text/images are analyzed using Claude AI
   - Vector embeddings are generated via VoyageAI
   - Vectors are stored in MongoDB with proper indexing
4. **Error Handling**: Consistent error responses with proper HTTP status codes
5. **Type Safety**: Strict TypeScript with comprehensive type definitions in `/app/types/`

### Environment Variables Required
```
MONGODB_URI          # MongoDB Atlas connection string
VOYAGE_API_KEY       # VoyageAI API key for embeddings
ANTHROPIC_API_KEY    # Claude API key for image analysis
OPENAI_API_KEY       # OpenAI API key (optional, for alternative LLM)
LLM_FOR_ANALYSIS     # Which LLM to use: "claude" or "openai"
VERCEL_URL           # Base URL (defaults to http://localhost:3000)
```

### Database Schema Considerations
- Projects are stored in the `projects` collection
- Each project contains embedded documents with vector fields
- Vector indexes must be created using `npm run create:index` before vector search will work
- Embedding dimensions: 1024 (VoyageAI default)

### Development Workflow
1. Ensure MongoDB connection is working: `npm run test:db`
2. Create vector indexes if not exists: `npm run create:index`
3. Start development server: `npm run dev`
4. Before committing, ensure linting passes: `npm run lint`

### API Integration Points
- **File Upload**: POST `/api/projects/[id]/upload` - Handles multipart form data
- **Vector Search**: POST `/api/vector-search` - Performs similarity search
- **Q&A Interface**: POST `/api/ask-question` - Natural language queries
- **Project Data**: GET/POST `/api/projects/data/[id]/content` - Manage project content

### Important Implementation Details
1. **File Processing**: 
   - Images: JPEG/JPG files analyzed via Claude AI
   - PDFs: Converted to images (one per page) with 2MB size limit per page
   - PDF files must be under 20MB
2. **PDF Processing Pipeline**:
   - Client-side conversion using pdf.js
   - Each page rendered to canvas with adjustable quality
   - Automatic scaling to meet 2MB size requirement
   - Progress tracking for multi-page documents
3. **Vector Generation**: All content is converted to text descriptions before embedding
4. **Search Types**: Supports both traditional text search and vector similarity search
5. **Response Streaming**: Q&A responses use streaming for better UX
6. **Dark Mode**: Implemented using next-themes with system preference support

## Project Query Workflow

The application implements a sophisticated multimodal query system that combines vector similarity search with LLM-powered analysis:

### 1. Main Search Entry Point
- **Primary API**: `/api/search/route.ts` - Global search across all data
- **Project-Specific API**: `/api/projects/[projectId]/search/` - Scoped to specific projects
- **Input Types**: Supports both text queries and image-based queries
- **Error Handling**: Implements retry logic with exponential backoff for timeouts

### 2. Query Processing Pipeline
```
User Query → Embedding Generation → Vector Search → LLM Analysis → Response
```

### 3. Core Workflow (`/api/search/route.ts`)

```typescript
POST /api/search
{
  query: string | base64Image,
  type: 'text' | 'image'  // defaults to 'text'
}
```

**Processing Steps**:
1. Validates query presence
2. Calls `doVectorSearchAndAnalyse()` with query and type
3. Returns results with LLM analysis

### 4. Detailed Processing in `doVectorSearchAndAnalyse()`

1. **Embedding Generation**:
   - Uses VoyageAI's `voyage-multimodal-3` model
   - Generates 1024-dimensional vectors
   - Handles both text and image embeddings

2. **Vector Search** (MongoDB Atlas):
   ```javascript
   {
     $vectorSearch: {
       "exact": false,
       "limit": 10,              // Global search returns more results
       "numCandidates": 100,     // Broader candidate pool
       "path": "embedding",
       "queryVector": queryEmbedding,
       "index": 'vector_index'
     }
   }
   ```
   - No project filtering for global search
   - Returns top 10 candidates
   - Applies similarity threshold of 0.6

3. **LLM Analysis**:
   - **Claude** (default): Uses `claude-3-5-haiku-20241022`
   - **OpenAI** (optional): Uses `gpt-4o-mini`
   - Processes all search results together
   - Generates comprehensive, contextual response

4. **Response Structure**:
   ```javascript
   {
     results: [/* vector search results with scores */],
     analysis: "LLM-generated comprehensive analysis"
   }
   ```

### 5. Key Functions and Files
- **Main API Route**: `/api/search/route.ts` - Entry point for global search
- **Core Orchestrator**: `doVectorSearchAndAnalyse()` in `/app/lib/utils.ts`
- **Vector Search**: MongoDB aggregation pipeline with `$vectorSearch` stage
- **LLM Integration**: `generateClaudeResponse()` in `/app/lib/claude.ts`
- **Embedding Service**: `generateMultimodalEmbedding()` in `/app/lib/voyageai.ts`

### 6. Project-Scoped vs Global Search
- **Global Search** (`/api/search/`): Searches across all data, returns up to 10 results
- **Project Search** (`/api/projects/[projectId]/search/`): Filtered by project, returns 2 results
- Both use the same `doVectorSearchAndAnalyse()` function with different parameters

### 7. Data Flow Considerations
- **Multimodal Support**: Seamlessly handles text and image queries
- **Performance**: Result limits vary by search scope (2 for project, 10 for global)
- **Timeout Handling**: Returns HTTP 529 status on timeout for retry logic
- **Score Filtering**: Only includes results with similarity >= 0.6
- **Error Handling**: Comprehensive error catching with appropriate status codes

### IMPORTANT
- When ready to test using browser, don't run the the dev server. Ask the user to run the command and then use puppeteer to open the browser and navigate to the ur
l.