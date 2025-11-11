# MongoDB Multi-Modal Vector Search Application

A powerful enterprise-grade application that enables semantic search across visual and textual data using MongoDB Atlas Vector Search, LangGraph, and the Vercel AI SDK. Transform your charts, diagrams, PDFs, and images into searchable knowledge and interact with it through an intelligent AI agent with planning capabilities.

## Features

### Agent-Centric Interface
- **Modern Two-Column Layout**: Collapsible side panel (384px) with main agent view
- **Multi-Select Workflow**: Search/Browse → Select items → Feed to Agent → Get answers
- **Focus Mode**: Distraction-free interface (Cmd/Ctrl+Shift+F)
- **Keyboard Shortcuts**: Cmd/Ctrl+B to toggle side panel
- **Image Preview Modal**: Full-screen zoom, keyboard navigation, download

### Intelligent AI Agent (LangGraph-Powered)
- **Mandatory Planning Phase**: Agent creates visible execution plan before taking action
- **Advanced Tool Suite**: 7 specialized tools including vector search, image analysis, web search, and email
- **Reference Tracking**: Bidirectional tracking between conversations and data sources
- **Step Execution Monitoring**: Detailed metrics for each tool call (duration, tokens, outputs)
- **Budget-Aware Reasoning**: Manages step limits intelligently (5 steps general, 8 steps deep mode)
- **Feature Flags**: Enable/disable web search and email tools independently

### Multi-Modal Search
- **Vector Search**: Semantic similarity across text and images
- **Visual Query Support**: Search using natural language or images
- **Project-Scoped Search**: Fast, paginated results within projects
- **Configurable Strategies**: Different search parameters for Search/Chat/Agent modes

### AI-Powered Analysis
- **Dual LLM Support**: Choose between Claude or OpenAI for analysis
- **Visual Content Extraction**: Analyzes charts, diagrams, tables, and images
- **Smart Compression**: Reduces token usage by 60-80% before analysis
- **Contextual Understanding**: Project-aware analysis with user query context

### Data Management
- **Project Organization**: Group related documents into searchable projects
- **Batch Processing**: Analyze and process multiple files simultaneously
- **PDF Support**: Converts PDFs to images page-by-page for analysis
- **Image Formats**: JPEG, PNG (max 20MB for PDFs)

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with **M10+ cluster** (required for vector search)
- API Keys:
  - [Anthropic Claude API key](https://console.anthropic.com/) (required)
  - [VoyageAI API key](https://dash.voyageai.com/) (required)
  - [OpenAI API key](https://platform.openai.com/) (optional, for OpenAI analysis)
  - [Perplexity API key](https://www.perplexity.ai/) (optional, for agent web search)
  - [Resend API key](https://resend.com/) (optional, for agent email functionality)
  - [LangSmith API key](https://smith.langchain.com/) (optional, for tracing/debugging)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/mongo-multimodal.git
cd mongo-multimodal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# MongoDB Atlas Connection String (M10+ cluster required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/test?retryWrites=true&w=majority

# Required: AI Service API Keys
VOYAGE_API_KEY=your-voyage-api-key            # VoyageAI for embeddings
ANTHROPIC_API_KEY=your-anthropic-api-key      # Claude for analysis/chat

# Optional: Alternative LLM Provider
OPENAI_API_KEY=your-openai-api-key            # OpenAI (optional alternative)
LLM_FOR_ANALYSIS=claude                        # Options: "claude" or "openai"

# Optional: Agent External Tools
PERPLEXITY_API_KEY=your-perplexity-api-key    # Web search capability
AGENT_WEB_SEARCH_ENABLED=true                  # Enable/disable web search

EMAIL_API_KEY=your-resend-api-key              # Email sending via Resend
EMAIL_FROM=noreply@yourdomain.com              # From address for emails
EMAIL_ENABLED=true                             # Enable/disable email tool

# Optional: Agent Configuration
AGENT_PLANNING_ENABLED=true                    # Enable planning phase (recommended)

# Optional: LangSmith Tracing (for debugging agent)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=mongo-multimodal             # Organize runs in LangSmith

# Optional: Unstructured.io (for advanced document parsing)
UNSTRUCTURED_API_URL=http://localhost:8000
UNSTRUCTURED_API_KEY=                          # Leave empty for self-hosted
```

### 4. MongoDB Atlas Setup

#### Create Vector Search Index

You can create the vector search index in two ways:

**Option 1: Using the Script (Recommended)**
```bash
npm run create:index
```

**Option 2: Manual Creation in Atlas UI**
1. Go to your MongoDB Atlas cluster
2. Navigate to "Search" → "Create Search Index"
3. Select "JSON Editor" and use this configuration:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1024,
        "similarity": "cosine"
      }
    }
  }
}
```

4. Name the index: `vector_index`
5. Select the database: `test`
6. Select the collection: `projectData`

**Note**: Vector search requires MongoDB Atlas M10 tier or higher.

### 5. Initialize the Database

```bash
# Test database connection
npm run test:db

# Create vector search indexes
npm run create:index
```

## Getting Started

### Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Complete Usage Flow

### Step 1: Create a Project

1. Navigate to the homepage
2. Click "New Project" button
3. Fill in the project details:
   - **Name**: e.g., "Q4 Financial Reports"
   - **Description**: e.g., "Quarterly financial charts and analysis documents"
4. Click "Create Project"

### Step 2: Upload Documents

1. Open your newly created project
2. Use the side panel's **Upload** tab
3. Select files to upload:
   - **Images**: JPEG/PNG files (charts, graphs, diagrams)
   - **PDFs**: Multi-page documents (reports, presentations)
   - Maximum file size: 20MB for PDFs
4. Files are automatically uploaded and stored

### Step 3: Process Documents for Search

After uploading, documents need to be processed to generate embeddings:

#### Option A: Process Individual Files
1. Each uploaded file shows a "Process" button if not yet processed
2. Click "Process" on individual files
3. Wait for the processing indicator to complete

#### Option B: Batch Process
1. Select multiple unprocessed files using checkboxes
2. Click "Batch Process Selected" button
3. Monitor the progress bar as files are processed

Processing includes:
- Analyzing images/PDFs with Claude AI or OpenAI (based on `LLM_FOR_ANALYSIS`)
- Generating 1024-dimensional vector embeddings with VoyageAI
- Extracting metadata, tags, and insights

### Step 4: Interact with the AI Agent

The agent-centric interface provides a seamless workflow:

1. **Search or Browse** (Side Panel):
   - Use the Search tab for vector search queries
   - Use the Browse tab to explore all uploaded documents
   - Preview images with the eye icon (full-screen modal with zoom)

2. **Select Context** (Multi-Select):
   - Check boxes next to relevant documents
   - View selected items in the selection tray
   - Feed selected items as context to the agent

3. **Ask the Agent**:
   - Type your question in the agent chat
   - Agent creates a visible plan showing its strategy
   - Watch step-by-step progress as tools are executed
   - See real-time reference tracking

4. **Review Sources**:
   - Expand the References panel to see all sources used
   - Click on references to view full content
   - Track which data items contributed to the answer

#### Agent Capabilities

The agent has access to these tools:

**Core Tools (Always Available):**
- `planQuery` - Creates execution plan (mandatory first step)
- `searchProjectData` - Vector search with configurable results (1-10)
- `searchSimilarItems` - Find related content by similarity
- `analyzeImage` - Context-aware image analysis
- `projectDataAnalysis` - Fetch stored analysis without base64

**External Tools (Optional):**
- `searchWeb` - Perplexity AI web search with citations (requires `PERPLEXITY_API_KEY`)
- `sendEmail` - Send emails via Resend API (requires `EMAIL_API_KEY`)

#### Agent Modes

- **General Mode** (5 steps): Quick queries, 1-2 searches + 1-2 analyses
- **Deep Mode** (8 steps): Complex queries, 2-3 searches + 3-4 analyses

### Step 5: View Analytics

Track agent performance and usage:
- Navigate to `/api/agent/analytics` endpoint
- Filter by project, session, or date range
- View tool usage statistics, step budgets, and reference patterns

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 15 App (React 19)                   │
│                  Agent-Centric UI with Side Panel               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌───────────┐   ┌───────────┐   ┌───────────┐
        │  Search   │   │   Chat    │   │  Agent    │
        │  Mode     │   │   Mode    │   │  Mode     │
        │  (Vector) │   │  (AI SDK) │   │(LangGraph)│
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Service Layer   │
                    ├──────────────────┤
                    │ • Vector Search  │
                    │ • Project Data   │
                    │ • References     │
                    │ • Perplexity     │
                    │ • Email          │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  MongoDB     │  │   VoyageAI   │  │  Claude AI   │
    │  Atlas       │  │  (Embeddings)│  │ / OpenAI     │
    │ (Vector DB)  │  │  1024-dim    │  │ (Analysis)   │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Project Structure

```
/app/
├── api/                        # Backend API routes
│   ├── agent/                 # LangGraph agent endpoint (AI SDK)
│   │   └── route.ts          # 7 tools, planning, reference tracking
│   ├── chat/                  # Vercel AI SDK chat endpoint
│   ├── projects/              # Project CRUD operations
│   │   ├── [projectId]/
│   │   │   ├── search/       # Vector search endpoint
│   │   │   ├── upload/       # File upload endpoint
│   │   │   └── data/         # Bulk operations (analyze, process)
│   │   └── data/[id]/        # Single-item operations
│   │       ├── analyze/      # AI analysis endpoint
│   │       ├── process/      # Embedding generation
│   │       └── references/   # Reference tracking
│   └── ...
├── lib/                       # Core utilities
│   ├── services/             # Service layer (business logic)
│   │   ├── projectData.service.ts    # Data operations
│   │   ├── vectorSearch.service.ts   # Unified vector search
│   │   ├── references.service.ts     # Bidirectional tracking
│   │   ├── perplexity.service.ts     # Web search
│   │   └── email.service.ts          # Email sending
│   ├── mongodb.ts            # Database connection
│   ├── claude.ts             # LLM response generation
│   ├── voyageai.ts           # Embedding generation
│   ├── image-utils.ts        # Image compression
│   └── pdf-to-image.ts       # PDF processing
├── projects/[projectId]/      # Project UI pages
│   └── components/           # React components
│       ├── AgentCentricLayout.tsx  # Main layout
│       ├── AgentView.tsx           # Agent interface
│       ├── SidePanel/              # Search, Browse, Upload
│       ├── Agent/                  # Plan, Progress, References
│       └── SelectionContext.tsx    # Multi-select state
├── types/                     # TypeScript definitions
│   ├── models.ts             # Server-side types
│   └── clientTypes.ts        # Client-side types
└── scripts/                   # Utility scripts
    ├── test-db.ts            # Test MongoDB connection
    └── create-vector-index.ts # Create vector indexes
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run test:db          # Test MongoDB connection
npm run create:index     # Create vector search indexes
```

## Use Cases

### Financial Services
- Search quarterly reports by chart patterns
- Find anomalies across financial visualizations
- Compare internal reports with web articles
- Connect insights from multiple documents

### Manufacturing
- Locate technical diagrams by description
- Find similar defect patterns across quality reports
- Search equipment manuals with natural language
- Predict maintenance needs from visual patterns

### Healthcare & Research
- Search medical images by visual similarity
- Find molecular structures across research papers
- Compare clinical trial results
- Connect patient data with clinical insights

### Enterprise Knowledge Management
- Unified search across all visual assets
- Break down information silos
- Preserve institutional knowledge
- Automated report generation via email

## Production Deployment

### Vercel Deployment (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard
4. Deploy: `vercel --prod`

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Best Practices

1. **API Keys**: Never commit API keys to version control
2. **MongoDB**: Use connection strings with authentication
3. **File Uploads**: Implement file size and type restrictions (already in place)
4. **Access Control**: Add authentication for production use
5. **Data Privacy**: Ensure compliance with data regulations (GDPR, HIPAA, etc.)
6. **Rate Limiting**: Implement rate limits for API endpoints
7. **Input Validation**: All inputs validated with Zod schemas

## Troubleshooting

### Common Issues

1. **"Vector index not found"**
   - Run `npm run create:index`
   - Ensure index name is `vector_index`
   - Check database name is `test` (hardcoded in `lib/mongodb.ts`)

2. **"Failed to generate embeddings"**
   - Check `VOYAGE_API_KEY` in `.env.local`
   - Verify VoyageAI API quota hasn't been exceeded
   - Check network connectivity

3. **"MongoDB connection failed"**
   - Verify `MONGODB_URI` connection string
   - Check IP whitelist in Atlas (allow your IP or 0.0.0.0/0 for all)
   - Ensure cluster is M10+ for vector search

4. **"File upload fails"**
   - Check file size (max 20MB for PDFs)
   - Ensure proper file format (JPEG, PNG for images)
   - Check browser console for errors

5. **"Agent planning not working"**
   - Verify `AGENT_PLANNING_ENABLED=true` in `.env.local`
   - Check LangSmith for trace logs if enabled
   - Ensure Claude API key is valid

6. **"Web search tool not available"**
   - Set `PERPLEXITY_API_KEY` in `.env.local`
   - Ensure `AGENT_WEB_SEARCH_ENABLED=true`
   - Check Perplexity API quota

## API Reference

### Search Endpoints

```typescript
// Project-specific vector search
POST /api/projects/[projectId]/search
{
  "query": "revenue charts Q3",
  "type": "text" | "image",
  "page": 1,
  "limit": 10
}

Response: {
  results: ProjectData[],
  total: number,
  page: number,
  totalPages: number
}
```

### File Operations

```typescript
// Upload file to project
POST /api/projects/[projectId]/upload
FormData: { file: File }

Response: { success: true, data: ProjectData }

// Analyze single document (AI analysis)
POST /api/projects/data/[id]/analyze
Response: { success: true, data: ProjectData }

// Process single document (generate embedding)
POST /api/projects/data/[id]/process
Response: { success: true, data: ProjectData }

// Bulk analyze
POST /api/projects/[projectId]/data/analyze
{ "dataIds": ["id1", "id2", ...] }

// Bulk process
POST /api/projects/[projectId]/data/process
{ "dataIds": ["id1", "id2", ...] }
```

### Agent Endpoints

```typescript
// Agent chat (streaming)
POST /api/agent
{
  "messages": Message[],
  "projectId": string,
  "sessionId": string,
  "analysisDepth": "general" | "deep"
}
Response: StreamingTextResponse with tool calls

// Agent analytics
GET /api/agent/analytics?projectId=xxx&startDate=xxx&endDate=xxx
Response: {
  toolUsage: { [tool: string]: { count, avgDuration, totalDuration } },
  stepBudget: { average, min, max },
  planAccuracy: { avgEstimated, avgActual },
  references: { total, byType: {...}, topItems: [...] },
  insights: {...}
}
```

### Reference Tracking

```typescript
// Get references for a data item
GET /api/projects/data/[id]/references
Response: {
  dataItem: ProjectData,
  conversations: Conversation[]
}
```

## Advanced Configuration

### LLM Provider Selection

Configure which LLM analyzes your images:

```bash
# Use Claude (faster, cheaper for images)
LLM_FOR_ANALYSIS=claude

# Use OpenAI (alternative)
LLM_FOR_ANALYSIS=openai
```

Models used:
- Claude: `claude-haiku-4-5-20251001`
- OpenAI: `gpt-5-nano-2025-08-07`

### Vector Search Strategies

The application uses different search strategies based on mode:

```typescript
// Search Mode: Paginated, broader threshold
{ limit: 200, numCandidates: 800, threshold: 0.3 }

// Chat Mode: Tight focus
{ limit: 2, numCandidates: 150, threshold: 0.2 }

// Agent Mode: High precision
{ limit: 2, numCandidates: 150, threshold: 0.6 }
```

### Agent Step Budget

Control agent depth:

```typescript
// General mode (default)
analysisDepth: "general"  // 5 steps total

// Deep mode
analysisDepth: "deep"     // 8 steps total
```

## Performance Considerations

- **Vector Search Pagination**: Limits result sets for fast responses
- **Image Compression**: Reduces token usage by 60-80%
- **Conversation Storage**: Base64 stripped before saving (16MB limit)
- **HMR Safety**: MongoDB client uses global caching in development
- **Reference Tracking**: Non-blocking updates
- **Tool Execution**: Parallel execution where possible
- **Service Layer**: Centralized logic prevents duplication

## Database Schema

### Collections

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
    text?: string,
    base64?: string
  },
  metadata: {
    filename: string,
    mimeType: string,
    size: number
  },
  analysis?: {
    description: string,
    tags: string[],
    insights: string[],
    facets: Record<string, any>
  },
  embedding?: number[],        // 1024-dimensional vector
  referencedBy?: Array<{       // Bidirectional tracking
    conversationId: ObjectId,
    sessionId: string,
    timestamp: Date,
    context: string,
    toolCall: string
  }>,
  processedAt?: Date,
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
    content: string
  },
  timestamp: Date,
  plan?: {                     // Agent's execution plan
    steps: string[],
    estimatedToolCalls: number,
    rationale: string,
    needsExternalData: boolean,
    toolsToUse: string[]
  },
  references?: Array<{         // Sources used
    type: 'projectData' | 'web' | 'email',
    dataId?: string,
    url?: string,
    title: string,
    usedInStep: number,
    toolCall: string,
    score?: number
  }>,
  toolExecutions?: Array<{     // Detailed tracking
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

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- MongoDB Atlas for enterprise-grade vector search
- Anthropic for Claude AI and the incredible multimodal capabilities
- VoyageAI for state-of-the-art multimodal embeddings
- Vercel for the AI SDK and seamless deployment
- LangChain/LangGraph for agentic workflow capabilities
- Next.js team for the amazing React framework

## Support

- Documentation: This README
- Issues: [GitHub Issues](https://github.com/your-repo/mongo-multimodal/issues)
- CLAUDE.md: See project instructions for developers

---

Built with MongoDB Atlas Vector Search, Claude AI, VoyageAI, and Next.js 15
