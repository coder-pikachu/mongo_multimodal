# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Next.js 15 application that enables semantic search across visual and textual data using MongoDB Atlas Vector Search, VoyageAI embeddings, and Anthropic Claude AI. Users can upload images and PDFs, which are analyzed by AI and converted into 1024-dimensional vector embeddings for multimodal search.

## Development Commands

```bash
# Development
npm run dev              # Start Next.js development server with Turbopack
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Run ESLint

# Database Operations
npm run test:db         # Test MongoDB connection (runs app/scripts/test-db.ts)
npm run create:index    # Create vector search indexes in MongoDB Atlas (runs app/scripts/create-vector-index.ts)
```

## Architecture

### Service Layer Pattern

The codebase follows a clean service layer architecture to eliminate code duplication:

**Service Layer** (`app/lib/services/`)
- `projectData.service.ts` - All projectData operations (analyze, process, bulk operations)
- `vectorSearch.service.ts` - Unified vector search with configurable strategies
- `perplexity.service.ts` - Web search via Perplexity AI API
- `email.service.ts` - Email sending via Resend API
- `references.service.ts` - Bidirectional reference tracking between conversations and projectData

**Route Handlers** (`app/api/`)
- Thin controllers that delegate to service layer
- Consistent error handling
- No business logic duplication

**Utilities** (`app/lib/`)
- `utils.ts` - Re-exports service functions for backward compatibility
- `claude.ts` - LLM response generation
- `voyageai.ts` - Embedding generation
- `mongodb.ts` - Database connection

### Three Interaction Modes

The application provides three distinct ways to interact with data, each using different AI approaches:

1. **Search Mode** (`/api/projects/[projectId]/search`)
   - Direct vector search with pagination
   - Returns top-k results with similarity scores
   - Uses Claude/OpenAI to synthesize results via `lib/claude.ts::generateLLMResponse()`

2. **Chat Mode** (`/api/chat/route.ts`)
   - Conversational Q&A using Vercel AI SDK
   - RAG-enhanced: Performs vector search, then streams response with context
   - Uses `claude-haiku-4-5-20251001` model via `@ai-sdk/anthropic`

3. **Agent Mode** (`/api/agent/route.ts`)
   - LangGraph-inspired agentic workflow with advanced planning and multi-tool support
   - **Planning Phase**: Agent must create a plan first using `planQuery` tool before execution
   - **Core Tools**: `searchProjectData`, `searchSimilarItems`, `analyzeImage`, `projectDataAnalysis`
   - **External Tools** (feature-flagged): `searchWeb` (Perplexity), `sendEmail` (Resend)
   - **Reference Tracking**: Automatically tracks which projectData items were used in conversations
   - **Step Execution Tracking**: Records detailed metrics for each tool call (duration, inputs, outputs)
   - Supports multi-step reasoning with `stopWhen: stepCountIs(depth)` parameter
   - Can analyze up to 5 images per query in deep mode
   - Saves conversation history with plan, tool executions, and references to MongoDB

### Data Processing Pipeline

1. **Upload** (`/api/projects/[projectId]/upload/route.ts`)
   - Accepts images (JPEG/PNG) and PDFs (max 20MB)
   - Stores raw base64 in MongoDB `projectData` collection
   - Sets `embedding: null` initially

2. **Analysis** (`/api/projects/data/[id]/analyze/route.ts`)
   - Uses Claude or OpenAI (configurable via `LLM_FOR_ANALYSIS` env var) to analyze visual content
   - Extracts description, tags, insights, and facets
   - Stores in `projectData.analysis` field
   - Does NOT generate embeddings (analysis and embedding are separate steps)

3. **Embedding Generation** (`/api/projects/data/[id]/process/route.ts`)
   - Calls `lib/voyageai.ts::generateMultimodalEmbedding()`
   - Sends text and/or base64 image to VoyageAI `voyage-multimodal-3` model
   - Stores 1024-dimensional vector in `projectData.embedding`
   - Sets `processedAt` timestamp

4. **Vector Search**
   - Uses MongoDB Atlas vector search index named `vector_index` on `multimodal.projectData` collection
   - Index configuration: `{ "embedding": { "type": "knnVector", "dimensions": 1024, "similarity": "cosine" } }`
   - Search implementation in `lib/utils.ts::doPaginatedVectorSearch()`

### Key Libraries and Integrations

- **MongoDB**: Connection managed in `lib/mongodb.ts`, uses HMR-safe global caching in development
- **Database Name**: Hardcoded to `"test"` in `lib/mongodb.ts::getDb()` (line 33)
- **VoyageAI**: Multimodal embeddings via `lib/voyageai.ts`, model: `voyage-multimodal-3`
- **Anthropic**: Image analysis and chat via `@ai-sdk/anthropic` and `@anthropic-ai/sdk`
- **OpenAI**: Optional provider for analysis/chat via `@ai-sdk/openai`
- **PDF Processing**: `pdfjs-dist` converts PDFs to images via `lib/pdf-to-image.ts`
- **Image Compression**: `lib/image-utils.ts::compressImage()` optimizes images before analysis to reduce token usage

### Collections Schema

**projects**
```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  createdAt: Date,
  updatedAt: Date
}
```

**projectData**
```typescript
{
  _id: ObjectId,
  projectId: ObjectId,
  type: 'image' | 'document',
  content: {
    text?: string,      // For documents
    base64?: string     // For images (stored in full resolution)
  },
  metadata: {
    filename: string,
    mimeType: string,
    size: number
  },
  analysis?: {          // Generated by Claude/OpenAI
    description: string,
    tags: string[],
    insights: string[],
    facets: Record<string, any>
  },
  embedding?: number[], // 1024-dimensional vector from VoyageAI
  referencedBy?: Array<{  // NEW: Track which conversations used this data
    conversationId: ObjectId,
    sessionId: string,
    timestamp: Date,
    context: string,    // What question it helped answer
    toolCall: string    // Which tool used it
  }>,
  processedAt?: Date,   // When embedding was generated
  createdAt: Date,
  updatedAt: Date
}
```

**conversations**
```typescript
{
  _id: ObjectId,
  projectId: string,
  sessionId: string,
  message: {
    role: 'user' | 'assistant',
    content: string    // Base64 image data is stripped before saving
  },
  timestamp: Date,
  contentCleaned?: boolean,
  plan?: {              // NEW: Agent's execution plan
    steps: string[],
    estimatedToolCalls: number,
    rationale: string,
    needsExternalData: boolean,
    toolsToUse: string[]
  },
  references?: Array<{  // NEW: Sources used in this conversation
    type: 'projectData' | 'web' | 'email',
    dataId?: string,    // For projectData
    url?: string,       // For web
    title: string,
    usedInStep: number,
    toolCall: string,
    score?: number      // For search results
  }>,
  toolExecutions?: Array<{  // NEW: Detailed tool usage tracking
    step: number,
    tool: string,
    input: Record<string, unknown>,
    output: unknown,
    duration: number,
    tokens?: number,
    timestamp: Date
  }>
}
```

## Environment Configuration

Required environment variables in `.env.local`:

```bash
# MongoDB Atlas (M10+ required for vector search)
MONGODB_URI=mongodb+srv://...

# AI Services
VOYAGE_API_KEY=...              # VoyageAI for embeddings
ANTHROPIC_API_KEY=...           # Claude for analysis and chat
OPENAI_API_KEY=...              # Optional, for OpenAI models

# LLM Selection
LLM_FOR_ANALYSIS=claude         # "claude" or "openai" - controls which provider analyzes images

# Agent External Tools (Optional)
PERPLEXITY_API_KEY=...          # For web search in agent mode
AGENT_WEB_SEARCH_ENABLED=true   # Enable/disable web search tool

# Gmail SMTP (replaces Resend)
GMAIL_USER=your-email@workspace.com       # Gmail workspace email
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx    # 16-character app password from Google
EMAIL_ENABLED=true                        # Enable/disable email tool

# Agent Features
AGENT_PLANNING_ENABLED=true     # Enable/disable planning phase (recommended: true)
AGENT_MEMORY_ENABLED=true       # Enable/disable memory system (recommended: true)
MULTI_AGENT_ENABLED=true        # Enable/disable multi-agent coordination

# Optional: LangSmith tracing for agent mode
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=...
```

## Service Layer Details

### ProjectData Service (`lib/services/projectData.service.ts`)

Provides centralized functions for all projectData operations:

**Core Functions:**
- `analyzeImageItem(db, itemId)` - Analyze single image with AI (respects `LLM_FOR_ANALYSIS` env var)
- `processItemEmbedding(db, itemId)` - Generate embedding for single item
- `bulkAnalyzeImages(db, projectId, itemIds)` - Validate and queue multiple items for analysis
- `bulkProcessEmbeddings(db, projectId, itemIds)` - Process multiple items in sequence
- `getItemContent(db, itemId)` - Lazy load item content (base64 or text)

**Benefits:**
- Single source of truth for business logic
- Consistent model selection across all routes
- Easier testing and maintenance
- DRY principle - no duplicate code

**Model Selection:**
All analysis functions automatically use the provider specified in `LLM_FOR_ANALYSIS` environment variable:
- `claude` → `claude-haiku-4-5-20251001`
- `openai` → `gpt-5-nano-2025-08-07`

### Vector Search Service (`lib/services/vectorSearch.service.ts`)

Unified vector search implementation with three configurable strategies:

**Core Functions:**
- `performVectorSearch(db, query, queryType, config, projectId?)` - Base search function
- `paginatedVectorSearch(db, projectId, query, type, page, limit)` - Search mode with pagination
- `vectorSearchWithAnalysis(db, query, queryType, projectId?, provider?)` - Search + LLM synthesis

**Search Strategies:**
```typescript
// Paginated (Search Mode)
{ limit: 200, numCandidates: 800, similarityThreshold: 0.3 }

// Analysis (Chat/Legacy Mode)
// Project-specific: { limit: 2, numCandidates: 150, threshold: 0.2 }
// Global: { limit: 10, numCandidates: 300, threshold: 0.2 }

// Agent Mode
{ limit: 2, numCandidates: 150, similarityThreshold: 0.6 }
```

**Benefits:**
- Single implementation for all vector search needs
- Configurable parameters based on use case
- Consistent text boosting for relevance
- Centralized project context handling

### Route Consolidation

**Before Refactoring:**
- `/api/projects/data/[id]/analyze` - 67 lines, duplicate logic
- `/api/projects/data/[id]/process` - 62 lines, duplicate logic
- `/api/projects/[projectId]/data/analyze` - 32 lines, duplicate logic
- `/api/projects/[projectId]/data/process` - 63 lines, duplicate logic

**After Refactoring:**
- Each route: ~20 lines, thin controller
- All business logic in services
- Consistent error handling
- **~80% code reduction in routes**

## Important Implementation Details

### Vector Search Configuration

- **Index Name**: Must be `vector_index` (referenced in search queries)
- **Database**: Hardcoded to `"test"` in `lib/mongodb.ts`
- **Collection**: `projectData`
- **Similarity Threshold**: 0.5 for search mode, 0.6 for agent mode (in `lib/utils.ts`)
- Vector search returns score from 0-1 where higher = more similar

### Agent Mode Tool Usage

The agent uses three tools defined in `/api/agent/route.ts`:

1. **searchProjectData**: Returns top 2 results per call, includes scores and descriptions
2. **analyzeImage**: Fetches image by dataId, compresses it, sends to Claude/OpenAI for context-aware analysis
3. **projectDataAnalysis**: Fetches stored analysis without base64 (faster, uses cached analysis)

Agent system prompt emphasizes:
- **CRITICAL CONSTRAINT**: Only use information from project data via tools (prevents hallucination)
- Never use external knowledge, assumptions, or training data
- Explicitly state when data is not found in the project
- **Step Budget Management**: Agent knows its step limits and plans accordingly
- **Planning Phase**: Agent must plan tool usage BEFORE execution
- Multiple focused tool calls over broad searches
- Iterative refinement (1-2 single-word probes first)
- Mandatory final synthesis step after tool usage
- Project context awareness

The prompt includes explicit hallucination prevention with ❌/✅ rules to enforce data-grounded responses.

### Step Budget System

**How It Works:**
- Each tool call consumes 1 step
- Final text response also consumes 1 step
- Agent MUST reserve the final step for synthesis

**Step Allocation:**
```
General Mode (analysisDepth: 'general'):
- Total: 5 steps
- Tools: Up to 4 steps
- Synthesis: 1 step (mandatory)
- Strategy: 1-2 searches + 1-2 analyses + synthesis

Deep Mode (analysisDepth: 'deep'):
- Total: 8 steps
- Tools: Up to 7 steps
- Synthesis: 1 step (mandatory)
- Strategy: 2-3 searches + 3-4 analyses + synthesis
```

**Planning Phase:**
The agent is instructed to plan BEFORE making any tool calls:
1. Analyze what information is needed
2. Plan which tools to use and in what order
3. Verify sufficient steps remain
4. Prioritize essential information over exhaustive exploration

**Failure Prevention:**
- System prompt explicitly warns: "If you use all steps on tools, you CANNOT provide an answer"
- Agent monitors step usage after each tool call
- Better to synthesize partial results than run out of steps without answering
- If search returns no results, agent tries 1-2 alternatives then concludes (not exhaustive retries)

### Image Compression Strategy

Before sending images to LLMs for analysis (`lib/image-utils.ts`):
- Target: 768px max dimension
- Quality: 85% (JPEG)
- Estimates token usage: ~765 tokens per 1024px image
- Compression reduces API costs and latency

### PDF Handling

PDFs are converted to images page-by-page:
- Each page becomes a separate `projectData` document with `type: 'image'`
- Uses `pdfjs-dist` with canvas rendering
- Original PDF is not stored; only the page images

### Provider Selection

Both Claude and OpenAI are supported. Selection is controlled by `LLM_FOR_ANALYSIS` environment variable:
- **Chat Mode**: Always uses Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Agent Mode**: Respects `LLM_FOR_ANALYSIS` for tool execution
- **Analysis**: Respects `LLM_FOR_ANALYSIS` for visual content analysis
- OpenAI uses `gpt-5-nano-2025-08-07` when selected

## Testing and Debugging

### Database Connection Test
```bash
npm run test:db
```
Verifies MongoDB URI and lists collections.

### Vector Index Creation
```bash
npm run create:index
```
Creates the required `vector_index` in MongoDB Atlas. Index must be created manually in Atlas UI if script fails (requires M10+ cluster).

### Common Issues

1. **"Vector index not found"**: Run `npm run create:index` or create manually in Atlas
2. **Database name mismatch**: Ensure MongoDB URI database matches `"test"` or update `lib/mongodb.ts::getDb()`
3. **Embedding fails**: Check VoyageAI API key and quota
4. **Analysis fails**: Check Anthropic/OpenAI API keys based on `LLM_FOR_ANALYSIS` setting

## Frontend Structure

### Agent-Centric UI (Default)

**Layout**: `/app/projects/[projectId]/components/AgentCentricLayout.tsx`
- Two-column layout: collapsible side panel (384px) + main agent view
- Side panel modes: Search, Browse, Upload
- Focus mode and keyboard shortcuts (Cmd+B to toggle)
- Multi-select with SelectionContext for feeding data to agent

**Key Components**:
- `SelectionContext.tsx` - Global state for multi-select across panels
- `ImagePreviewModal.tsx` - Reusable image preview popup with zoom, download, navigation
- `SidePanel/` - Search, Browse, Upload, SelectionTray components
- `Agent/` - PlanCard, SelectedContextBanner, StepProgressTracker, ReferencesPanel
- `AgentView.tsx` - Enhanced with plan tracking, progress visualization, reference extraction

**Features**:
- Image preview with Eye icon button in Search/Browse/DataExplorer/References
- Modal with zoom controls, keyboard navigation (←/→), download, ESC to close
- User Flow: Search/Browse → Select items → Feed to Agent → Watch plan & progress → Review sources

### Legacy Tab Interface (Optional)

Access via query params: `?mode=search`, `?mode=chat`, `?mode=explorer`
- **Tab Components**: `SearchView.tsx`, `ChatView.tsx`, `AgentView.tsx`, `DataExplorerView.tsx`
- **Data Explorer**: Shows uploaded files with process/analyze buttons
- **Batch Processing**: `BatchProcessButton.tsx` processes multiple files sequentially
- **React Query**: Used for data fetching and cache management via `@tanstack/react-query`

## Code Quality

- **ESLint**: Next.js recommended config
- **TypeScript**: Strict mode enabled
- **Type Definitions**: `app/types/models.ts` and `app/types/clientTypes.ts`
- **Validation**: Zod schemas in `app/lib/validations.ts`
- **Service Layer**: Clean separation of business logic from route handlers
- **DRY Principle**: No code duplication across routes
- **Backward Compatibility**: `utils.ts` re-exports service functions for legacy code

## Recent Optimizations

### Comprehensive Cleanup (Latest)
**Removed Redundant Files (4 deletions):**
- ✅ Deleted `/api/search/route.ts` - Unused global search route (duplicated by project-scoped search)
- ✅ Deleted `/app/myprojects/[projectId]/loading.tsx` - Orphaned loading component with no page
- ✅ Deleted `/api/ask-question/route.ts` - Legacy demo API (functionality in chat/agent)
- ✅ Deleted `/app/vector-search/page.tsx` - Standalone demo page (not part of main app)

**Code Cleanup:**
- ✅ Removed placeholder function `_searchWebHelper` from agent route
- ✅ Removed commented-out web search tool code
- ✅ Fixed missing `doVectorImageSearch` function in `/api/vector-search/route.ts`
- ✅ Fixed unused `projectId` prop in `BatchProcessButton` component
- ✅ All routes now use centralized vector search service
- ✅ Step budget system added to prevent incomplete agent responses

**Architecture Verified:**
- ✅ Dual route pattern (`/projects/data/[id]/` vs `/projects/[projectId]/data/`) is intentional
  - Single-item routes: Individual operations by global ID
  - Bulk routes: Batch operations with project scoping
- ✅ ProcessButton vs BatchProcessButton serve different use cases
- ✅ All service layer functions are actively used (no dead code)

### Service Layer Refactoring
- ✅ Created `projectData.service.ts` for all data operations
- ✅ Created `vectorSearch.service.ts` for unified search logic
- ✅ Reduced route handler code by ~80%
- ✅ Consistent model selection across all endpoints
- ✅ Single source of truth for business logic

## Enhanced Agent System (Latest)

### Planning Phase
The agent now includes a **mandatory planning step** before execution:
- **planQuery Tool**: Agent creates a visible plan showing decomposed steps, tool selection, and estimated tool calls
- **Transparency**: Users see the agent's strategy before it executes
- **Budget Awareness**: Agent verifies step budget sufficiency during planning
- **Adaptability**: Agent can adjust plan if results require different approach

### Expanded Tool Suite

**Core Research Tools (Always Available):**
1. **planQuery** - Create execution plan (mandatory first step)
2. **searchProjectData** - Vector search with configurable maxResults (1-10)
3. **searchSimilarItems** - Find related content by vector similarity
4. **analyzeImage** - Context-aware image analysis
5. **projectDataAnalysis** - Fetch stored analysis without base64

**External Tools (Feature-Flagged):**
6. **searchWeb** - Perplexity AI web search with citations (when `PERPLEXITY_API_KEY` set)
7. **sendEmail** - Send emails via Resend API (when `EMAIL_API_KEY` set)

### Reference Tracking System

**Bidirectional References:**
- **Conversations → ProjectData**: Tracks which data items were used via `references` array
- **ProjectData → Conversations**: Tracks where data was referenced via `referencedBy` array
- **Automatic Extraction**: References extracted from tool results and saved with conversations
- **Context Preservation**: Records the question context and tool that used each reference

**API Endpoints:**
- `/api/projects/data/[id]/references` - View all conversations that referenced a specific item
- `/api/agent/analytics` - Analytics on tool usage, plan accuracy, and reference patterns

### Step Execution Tracking

Every tool call is tracked with detailed metadata:
```typescript
{
  step: number,           // Sequential step number
  tool: string,           // Tool name
  input: object,          // Tool parameters
  output: any,            // Tool result
  duration: number,       // Execution time (ms)
  tokens?: number,        // Token usage (if available)
  timestamp: Date         // When executed
}
```

**Benefits:**
- **Debugging**: Trace exact agent behavior
- **Performance Analysis**: Identify slow tools
- **Cost Tracking**: Monitor token usage
- **Pattern Recognition**: Learn effective strategies

### Agent Analytics

The `/api/agent/analytics` endpoint provides:
- **Tool Usage**: Count, average duration, total duration per tool
- **Step Budget Analysis**: Average, min, max steps per conversation
- **Plan Accuracy**: Estimated vs. actual tool calls
- **Reference Statistics**: Total references, breakdown by type (projectData/web/email)
- **Top Referenced Items**: Most frequently used data items
- **Insights**: Most/slowest tools, planning adoption rate, external data usage

Query Parameters:
- `projectId` - Filter by project
- `sessionId` - Filter by session
- `startDate` / `endDate` - Date range filtering

### Agent System Prompt Enhancements

The agent is now instructed to:
1. **Always plan first** using planQuery tool
2. **Show strategy** to users before executing
3. **Monitor step budget** throughout execution
4. **Adapt plans** if needed based on results
5. **Reserve final step** for synthesis
6. **Use external tools** only when explicitly needed or project data insufficient

## Performance Considerations

- **Vector Search Pagination**: Implemented in `lib/utils.ts::doPaginatedVectorSearch()` to limit result sets
- **Image Compression**: Reduces token usage by ~60-80% before LLM analysis
- **Conversation Storage**: Base64 data is stripped before saving to `conversations` collection to avoid MongoDB document size limits (16MB)
- **HMR Safety**: MongoDB client uses global caching in development to prevent connection pool exhaustion
- **Reference Tracking**: Non-blocking - failures don't affect main conversation flow
- **Tool Execution Tracking**: Minimal overhead (~1-2ms per tool call)

---

## Advanced Features

### Gmail Email Integration

The application now uses Gmail SMTP via nodemailer instead of Resend for email functionality.

**Setup Requirements:**
1. Enable 2-Step Verification on your Google Workspace account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to bottom and click "App passwords"
   - Create app password for "Mail"
   - Copy the 16-character password
3. Add to `.env.local`:
   ```bash
   GMAIL_USER=your-email@workspace.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   EMAIL_ENABLED=true
   ```

**Benefits:**
- No third-party API costs (Resend replacement)
- Direct Gmail workspace integration
- Better deliverability and control
- Full SMTP functionality

**Implementation:**
- Service: `/app/lib/services/email.service.ts`
- Uses nodemailer with Gmail SMTP (smtp.gmail.com:587)
- Supports HTML email with markdown conversion
- Validation and error handling included

### Agent Memory System

Persistent memory layer that enables agents to remember context across conversations.

**Key Features:**
- **Semantic Search**: Memories are stored with vector embeddings for intelligent retrieval
- **Memory Types**:
  - `fact`: Objective information from project data
  - `preference`: User choices and patterns
  - `pattern`: Recurring themes in queries
  - `insight`: Analytical conclusions
- **Automatic Management**: Low-value memories pruned based on access patterns
- **Context Injection**: Relevant memories automatically added to agent prompts

**Database Schema:**
```typescript
// agentMemories collection
{
  _id: ObjectId,
  projectId: ObjectId,
  sessionId: string,
  type: 'fact' | 'preference' | 'pattern' | 'insight',
  content: string,
  embedding: number[],  // 1024-dim vector for search
  metadata: {
    source: string,
    confidence: number,  // 0-1 score
    accessCount: number,
    lastAccessed: Date
  },
  relatedMemories: ObjectId[],
  createdAt: Date,
  expiresAt?: Date,
  tags: string[]
}
```

**New Agent Tools:**
1. **rememberContext** - Store important information
   ```typescript
   {
     content: "User prefers detailed analysis",
     type: "preference",
     tags: ["user-behavior"]
   }
   ```

2. **recallMemory** - Retrieve relevant memories
   ```typescript
   {
     query: "user preferences for analysis",
     limit: 5,
     type: "preference"  // optional filter
   }
   ```

**API Functions:**
- `storeMemory()` - Save with automatic embedding generation
- `retrieveMemories()` - Semantic search over memories
- `getMemoryContext()` - Build context string for prompts
- `pruneMemories()` - Clean up low-value memories
- `extractMemoriesFromConversation()` - Auto-extract from conversations

**Configuration:**
```bash
AGENT_MEMORY_ENABLED=true  # Enable/disable memory system
```

### Multi-Agent Collaboration Framework

Advanced orchestration system with specialized agents working together.

**Architecture:**

```
User Query
    ↓
Coordinator Agent (orchestrates)
    ↓
┌─────────┬──────────┬─────────┬───────────┐
Search    Analysis   Memory    Synthesis
Agent     Agent      Agent     Agent
└─────────┴──────────┴─────────┴───────────┘
    ↓
Combined Result → User
```

**Agent Types:**

1. **Coordinator Agent** (`coordinator.agent.ts`)
   - Master orchestrator
   - Creates multi-agent execution plans
   - Delegates tasks to specialists
   - Manages agent communication
   - Synthesizes final response

2. **Search Agent** (`search.agent.ts`)
   - Information retrieval specialist
   - Vector search optimization
   - Similar items discovery
   - Web search integration (when enabled)

3. **Analysis Agent** (`analysis.agent.ts`)
   - Deep content analysis
   - Image analysis with context awareness
   - Comparative analysis
   - Fetches stored analyses

4. **Memory Agent** (`memory.agent.ts`)
   - Memory storage and retrieval
   - Context management
   - Pattern analysis
   - Memory linking

5. **Synthesis Agent** (`synthesis.agent.ts`)
   - Combines multi-agent results
   - Report generation
   - Summary creation
   - Markdown formatting

**Communication Protocol:**
```typescript
interface AgentMessage {
  from: AgentType,
  to: AgentType,
  messageId: string,
  conversationId: string,
  type: 'request' | 'response' | 'update' | 'error',
  payload: {
    task: string,
    data?: any,
    context?: string,
    priority?: 'low' | 'medium' | 'high' | 'critical'
  },
  timestamp: Date
}
```

**Database Schema:**
```typescript
// agentConversations collection
{
  _id: ObjectId,
  projectId: ObjectId,
  sessionId: string,
  userQuery: string,
  coordinatorPlan: {
    strategy: string,
    agentsInvolved: AgentType[],
    estimatedSteps: number,
    taskBreakdown: Array<{
      agent: AgentType,
      task: string,
      priority: Priority,
      dependencies?: AgentType[]
    }>
  },
  agentMessages: AgentMessage[],
  agentResults: {
    [agentType: string]: {
      status: 'pending' | 'completed' | 'failed',
      output: any,
      duration: number,
      tokensUsed?: number
    }
  },
  finalResponse: string,
  totalDuration: number,
  createdAt: Date
}
```

**API Endpoints:**

**POST `/api/multi-agent`** - Execute multi-agent workflow
```typescript
Request: {
  message: string,
  projectId: string,
  sessionId?: string,
  selectedDataIds?: string[]
}

Response: {
  success: boolean,
  conversationId: string,
  plan: CoordinatorPlan,
  agentResults: Array<{
    agent: AgentType,
    success: boolean,
    data: any
  }>,
  synthesis: string,
  executionTime: number,
  metadata: {
    agentsUsed: AgentType[],
    totalSteps: number
  }
}
```

**GET `/api/multi-agent?projectId={id}&limit={n}`** - Get conversation history
```typescript
Response: {
  conversations: Array<{
    id: string,
    userQuery: string,
    agentsInvolved: AgentType[],
    totalDuration: number,
    createdAt: Date,
    success: boolean
  }>
}
```

**Usage Example:**
```typescript
// Multi-agent query
const response = await fetch('/api/multi-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Compare Q1 and Q2 revenue and explain the trend',
    projectId: 'abc123',
    selectedDataIds: ['item1', 'item2']
  })
});

const result = await response.json();
console.log(result.plan);        // Coordinator's strategy
console.log(result.agentResults); // Each agent's contribution
console.log(result.synthesis);    // Final combined answer
```

**Benefits:**
- **Specialized Expertise**: Each agent focuses on specific tasks
- **Parallel Processing**: Agents can work independently
- **Better Decomposition**: Complex tasks broken into manageable subtasks
- **Transparency**: Full visibility into agent collaboration
- **Educational Value**: Demonstrates advanced AI orchestration patterns

**Coordination Service:**
- Message routing between agents
- State management for multi-agent workflows
- Performance analytics and monitoring
- Conversation persistence

**Configuration:**
```bash
MULTI_AGENT_ENABLED=true  # Enable/disable multi-agent system
```

**Key Files:**
- `/app/lib/agents/` - All agent implementations
- `/app/lib/services/coordination.service.ts` - Coordination logic
- `/app/api/multi-agent/route.ts` - API endpoint
- `/app/types/agent.types.ts` - Type definitions

---

## New Collections

### agentMemories
Stores persistent agent memories with vector embeddings for semantic search.

### agentConversations
Records multi-agent collaboration sessions with full message history and results.
