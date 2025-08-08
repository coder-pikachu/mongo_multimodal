# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a MongoDB Multimodal Vector Search application built with Next.js 15, TypeScript, MongoDB Atlas, LangGraph, and the Vercel AI SDK. It processes multimodal data (images and documents) using AI services to generate vector embeddings for semantic search capabilities. The application features three distinct interaction modes: Search, Chat, and Agent.

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
- **AI Framework**: LangGraph for agent workflows and reasoning
- **Chat Interface**: Vercel AI SDK for streaming conversations
- **AI Services**:
  - Anthropic Claude SDK for image analysis and conversational AI
  - VoyageAI for generating vector embeddings
  - Tavily AI for web search capabilities in agent mode
  - OpenAI API support (configurable via LLM_FOR_ANALYSIS)
- **Observability**: LangSmith for agent tracing and debugging
- **Styling**: TailwindCSS with PostCSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation

### Project Structure

```
/app/                    # Next.js App Router
├── api/                 # API routes for backend operations
│   ├── agent/          # LangGraph agent endpoint for complex reasoning
│   ├── chat/           # Vercel AI SDK chat endpoint for conversations
│   ├── projects/       # CRUD operations and project-specific search
│   └── search/         # Global search endpoints
├── lib/                # Core utilities and integrations
│   ├── mongodb.ts      # MongoDB connection and client
│   ├── claude.ts       # Claude AI integration for image analysis
│   ├── voyageai.ts     # VoyageAI embedding generation
│   └── utils.ts        # Shared helper functions including doPaginatedVectorSearch
├── components/         # Reusable React components
├── projects/           # Project-related pages
│   └── [projectId]/
│       └── components/
│           ├── SearchView.tsx    # Direct vector search with pagination
│           ├── ChatView.tsx      # Conversational interface
│           ├── AgentView.tsx     # AI agent interface
│           └── ProjectPageClient.tsx # Main tabbed interface
├── types/             # TypeScript type definitions
└── scripts/           # Database utility scripts
```

### Key Patterns and Conventions

1. **Three-Mode Interface**: Each project page features tabs for Search, Chat, and Agent modes
2. **API Routes**: All backend endpoints use Next.js API routes in `/app/api/`
3. **Database Access**: MongoDB connections are managed through `/app/lib/mongodb.ts` with connection pooling
4. **Vector Processing Pipeline**:
   - Files are uploaded and processed in `/app/api/projects/[id]/upload/`
   - Text/images are analyzed using Claude AI
   - Vector embeddings are generated via VoyageAI
   - Vectors are stored in MongoDB with proper indexing
5. **Agent Workflow**: LangGraph manages complex reasoning with tools and state management
6. **Streaming Responses**: Both chat and agent modes use streaming for real-time responses
7. **Error Handling**: Consistent error responses with proper HTTP status codes
8. **Type Safety**: Strict TypeScript with comprehensive type definitions in `/app/types/`

### Environment Variables Required

```
MONGODB_URI              # MongoDB Atlas connection string
VOYAGE_API_KEY           # VoyageAI API key for embeddings
ANTHROPIC_API_KEY        # Claude API key for image analysis and chat
BRAVE_SEARCH_API_KEY     # BraveSearch API key for web search in agent mode (FREE)
LANGCHAIN_TRACING_V2=true # Enable LangSmith tracing (optional)
LANGCHAIN_API_KEY        # LangSmith API key for agent debugging (optional)
LANGCHAIN_PROJECT        # Optional: Project name in LangSmith
OPENAI_API_KEY          # OpenAI API key (optional, for alternative LLM)
LLM_FOR_ANALYSIS        # Which LLM to use: "claude" or "openai"
VERCEL_URL              # Base URL (defaults to http://localhost:3000)
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

**Three-Mode System:**
- **Search Mode**: POST `/api/projects/[projectId]/search` with `mode: "search"` - Paginated vector search
- **Chat Mode**: POST `/api/chat` - Vercel AI SDK streaming chat
- **Agent Mode**: POST `/api/agent` - LangGraph agent with tools and reasoning

**Core Operations:**
- **File Upload**: POST `/api/projects/[id]/upload` - Handles multipart form data
- **Project Data**: GET/POST `/api/projects/data/[id]/content` - Manage project content

### Important Implementation Details

1. **Three Interaction Modes**:
   - **Search Mode**: Direct vector search with pagination, displays raw results with timing
   - **Chat Mode**: Conversational Q&A using Vercel AI SDK for streaming
   - **Agent Mode**: Complex reasoning with LangGraph, uses vector search and web search tools

2. **File Processing**:
   - Images: JPEG/JPG files analyzed via Claude AI
   - PDFs: Converted to images (one per page) with 2MB size limit per page
   - PDF files must be under 20MB

3. **PDF Processing Pipeline**:
   - Client-side conversion using pdf.js
   - Each page rendered to canvas with adjustable quality
   - Automatic scaling to meet 2MB size requirement
   - Progress tracking for multi-page documents

4. **Vector Generation**: All content is converted to text descriptions before embedding

5. **Agent Capabilities**:
   - Uses LangGraph for state management and tool orchestration
   - Has access to project-specific vector search tool
   - Can perform web searches using Tavily AI
   - Traces all operations to LangSmith for debugging

6. **Response Streaming**: Both chat and agent modes use streaming for better UX

7. **Dark Mode**: Implemented using next-themes with system preference support

## Project Query Workflow

The application now implements three distinct modes of interaction:

### 1. Search Mode

**Direct Vector Search with Pagination**
- **API**: POST `/api/projects/[projectId]/search` with `mode: "search"`
- **Function**: `doPaginatedVectorSearch()` in `/app/lib/utils.ts`
- **Features**: Fast, paginated results with timing information
- **UI**: `SearchView.tsx` with search bar and pagination controls

### 2. Chat Mode

**Conversational Interface**
- **API**: POST `/api/chat`
- **Technology**: Vercel AI SDK with streaming
- **Features**: Maintains conversation context, streaming responses
- **UI**: `ChatView.tsx` with message history and input form

### 3. Agent Mode

**AI Agent with Tools and Reasoning**
- **API**: POST `/api/agent`
- **Technology**: LangGraph with state management
- **Tools**: Vector search (project-specific) and web search (Tavily)
- **Features**: Complex reasoning, planning, tool use
- **UI**: `AgentView.tsx` with status indicators
- **Debugging**: Full traces available in LangSmith

### Core Functions and Files

- **Search Function**: `doPaginatedVectorSearch()` in `/app/lib/utils.ts`
- **Chat API**: `/app/api/chat/route.ts` using Vercel AI SDK
- **Agent API**: `/app/api/agent/route.ts` using LangGraph
- **Project Search API**: `/app/api/projects/[projectId]/search/route.ts` (handles both search and agent modes)
- **Vector Search**: MongoDB aggregation pipeline with `$vectorSearch` stage
- **LLM Integration**: `generateClaudeResponse()` in `/app/lib/claude.ts`
- **Embedding Service**: `generateMultimodalEmbedding()` in `/app/lib/voyageai.ts`

### Agent Architecture

The LangGraph agent follows this workflow:
1. **Input Processing**: Receives user query and project context
2. **Planning**: Determines which tools to use
3. **Tool Execution**: Can call vector search and web search tools
4. **Reasoning**: Synthesizes information from multiple sources
5. **Response Generation**: Provides comprehensive answer
6. **Tracing**: All steps logged to LangSmith for debugging

### Data Flow Considerations

- **Multimodal Support**: Seamlessly handles text and image queries across all modes
- **Performance**: Search mode optimized for speed, agent mode for comprehensiveness
- **Project Filtering**: All searches properly filtered by project ID
- **Error Handling**: Comprehensive error catching with appropriate status codes
- **Streaming**: Real-time response delivery in chat and agent modes

### IMPORTANT

- When ready to test using browser, don't run the dev server. Ask the user to run the command and then test with clear instructions.
- The three-mode interface (Search/Chat/Agent) is the primary user interaction pattern
- LangSmith tracing requires proper environment variables for agent debugging
- All vector searches are project-scoped for data isolation
