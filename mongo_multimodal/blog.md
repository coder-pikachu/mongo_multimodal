# Building an Enterprise Multi-Modal AI Agent: Vector Search Meets Intelligent Planning

Imagine having an AI assistant that doesn't just search your documents—it **plans**, **reasons**, and **synthesizes** information from multiple sources while showing you every step of its thinking process. Welcome to the future of enterprise knowledge management.

In this deep dive, we'll explore how to build a production-grade multi-modal AI agent that combines MongoDB Atlas Vector Search, LangGraph-inspired agentic workflows, and modern AI models to unlock the full potential of your visual and textual data.

## The Evolution: From Search to Intelligent Agents

Traditional enterprise search has three major limitations:

1. **Visual Data is Invisible**: Charts, diagrams, and images are unsearchable without manual tagging
2. **Simple Keyword Matching**: Can't understand semantic meaning or context
3. **No Reasoning**: Returns raw results without synthesizing insights

Modern AI agents solve these problems through:

- **Multi-Modal Understanding**: Analyze and search visual content as naturally as text
- **Semantic Search**: Find information based on meaning, not just keywords
- **Agentic Reasoning**: Plan multi-step research, use tools, and synthesize findings
- **Transparent Decision-Making**: Show the plan, tools used, and sources cited

## Architecture Overview: Agent-First Design

Our application follows an **agent-centric** architecture where the AI agent is the primary interface:

```
┌─────────────────────────────────────────────────────────┐
│         Agent-Centric UI (Two-Column Layout)            │
├──────────────────────┬──────────────────────────────────┤
│   Side Panel         │   Main Agent View                │
│   ├─ Search          │   ├─ Planning Phase              │
│   ├─ Browse          │   ├─ Tool Execution              │
│   ├─ Upload          │   ├─ Progress Tracking           │
│   └─ Selection Tray  │   └─ Reference Citations         │
└──────────────────────┴──────────────────────────────────┘
                       ↓
         ┌─────────────────────────────┐
         │    LangGraph Agent Engine   │
         │  (Vercel AI SDK + Claude)   │
         └──────────────┬──────────────┘
                        ↓
         ┌──────────────────────────────┐
         │    Service Layer (DRY)       │
         ├──────────────────────────────┤
         │ • Vector Search Service      │
         │ • Project Data Service       │
         │ • Reference Tracking Service │
         │ • Perplexity Web Search      │
         │ • Email Service (Resend)     │
         └──────────────┬───────────────┘
                        ↓
         ┌──────────────┼───────────────┐
         ↓              ↓               ↓
    ┌─────────┐  ┌──────────┐  ┌───────────┐
    │ MongoDB │  │ VoyageAI │  │ Claude AI │
    │ Atlas   │  │ 1024-dim │  │ / OpenAI  │
    │ Vector  │  │Embeddings│  │ Analysis  │
    └─────────┘  └──────────┘  └───────────┘
```

### Why Agent-First?

1. **Natural Interaction**: Users ask questions in natural language instead of crafting search queries
2. **Complex Reasoning**: Agent can decompose complex questions into multiple research steps
3. **Multi-Source Synthesis**: Combines internal data with external web search
4. **Provenance Tracking**: Every answer is backed by traceable sources
5. **Adaptive Behavior**: Agent adjusts strategy based on intermediate results

## The Power of Planning: Mandatory Pre-Execution Strategy

One of the most important innovations in our agent is the **mandatory planning phase**. Before executing any tools, the agent must create a visible plan.

### Why Planning Matters

Without planning, agents can:
- Waste steps on inefficient searches
- Run out of their step budget before answering
- Make redundant tool calls
- Provide incomplete answers

With planning, agents:
- Show users their strategy upfront
- Manage step budgets intelligently
- Make informed tool selections
- Adjust course when needed

### How Planning Works

```typescript
// 1. User asks a question
"Compare our Q3 financial performance with industry trends"

// 2. Agent creates a plan using the planQuery tool
{
  "steps": [
    "Search project data for Q3 financial reports and charts",
    "Analyze key financial metrics from found documents",
    "Search web for Q3 industry trends and benchmarks",
    "Compare internal data with industry benchmarks",
    "Synthesize findings into comprehensive answer"
  ],
  "estimatedToolCalls": 5,
  "toolsToUse": ["searchProjectData", "analyzeImage", "searchWeb"],
  "needsExternalData": true,
  "rationale": "Need both internal Q3 data and external industry trends for comparison"
}

// 3. User sees the plan before execution starts

// 4. Agent executes the plan step-by-step with progress tracking
```

### Step Budget Management

Our agent operates under strict step limits:

- **General Mode**: 5 steps (4 for tools + 1 for synthesis)
- **Deep Mode**: 8 steps (7 for tools + 1 for synthesis)

The agent **must reserve the final step for synthesis** to ensure it can always provide an answer, even if searches return limited results.

```typescript
// Agent system prompt includes budget warnings:
"CRITICAL: You have {maxSteps} steps total.
- Each tool call = 1 step
- Final text response = 1 step
- ALWAYS reserve the final step for your answer
- If you use all steps on tools, you CANNOT respond!"
```

## Multi-Modal Vector Search: Understanding Visual Content

The foundation of our agent is MongoDB Atlas Vector Search with VoyageAI's multimodal embeddings.

### The Multi-Modal Processing Pipeline

#### 1. Document Upload & Storage

```typescript
// Users upload images and PDFs through the side panel
POST /api/projects/[projectId]/upload

// PDFs are converted to images page-by-page
const pages = await convertPdfToImages(pdfBuffer);

// Each page becomes a separate searchable document
for (const page of pages) {
  await db.collection('projectData').insertOne({
    projectId: new ObjectId(projectId),
    type: 'image',
    content: { base64: page.imageData },
    metadata: {
      filename: `${originalName}_page_${page.number}.jpg`,
      mimeType: 'image/jpeg',
      size: page.size
    },
    embedding: null,  // Generated in next step
    createdAt: new Date()
  });
}
```

#### 2. AI-Powered Analysis

```typescript
// LLM analyzes visual content (Claude or OpenAI)
const analysisResult = await analyzeWithLLM({
  image: compressedBase64,  // Compressed 60-80% for efficiency
  prompt: `Analyze this image "${filename}".

  Extract:
  1. Detailed description of visual elements
  2. Key data points and metrics
  3. Notable patterns or trends
  4. Contextual insights
  5. Relevant tags for searchability

  Focus on information that would be valuable for semantic search.`
});

// Store analysis
await db.collection('projectData').updateOne(
  { _id: documentId },
  {
    $set: {
      analysis: {
        description: analysisResult.description,
        tags: analysisResult.tags,
        insights: analysisResult.insights,
        facets: analysisResult.facets
      },
      updatedAt: new Date()
    }
  }
);
```

#### 3. Vector Embedding Generation

```typescript
// VoyageAI generates 1024-dimensional multimodal embeddings
const embedding = await voyageai.embed({
  model: 'voyage-multimodal-3',
  inputs: [{
    content: analysisResult.description,  // Text description
    image: compressedBase64               // Visual features
  }]
});

// Store embedding for vector search
await db.collection('projectData').updateOne(
  { _id: documentId },
  {
    $set: {
      embedding: embedding.embeddings[0],
      processedAt: new Date()
    }
  }
);
```

#### 4. Vector Search Configuration

```typescript
// MongoDB Atlas vector index configuration
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1024,        // VoyageAI multimodal-3
        "similarity": "cosine"     // Cosine similarity scoring
      }
    }
  }
}

// Search with different strategies based on mode
const searchStrategies = {
  // Search Mode: Broad, paginated results
  search: {
    limit: 200,
    numCandidates: 800,
    similarityThreshold: 0.3
  },

  // Agent Mode: High precision, focused results
  agent: {
    limit: 2,
    numCandidates: 150,
    similarityThreshold: 0.6    // Higher threshold = stricter matching
  },

  // Chat Mode: Balanced approach
  chat: {
    limit: 2,
    numCandidates: 150,
    similarityThreshold: 0.2
  }
};
```

### Why VoyageAI Multimodal-3?

1. **True Multimodal**: Understands both visual and textual features
2. **High Dimensionality**: 1024 dimensions capture nuanced semantics
3. **Production-Ready**: Fast, reliable, cost-effective
4. **State-of-the-Art**: Outperforms many alternatives in multimodal retrieval

## The Agent Tool Suite: 7 Specialized Capabilities

Our agent has access to 7 tools, divided into core and external capabilities:

### Core Tools (Always Available)

#### 1. planQuery - Create Execution Strategy

```typescript
{
  name: 'planQuery',
  description: 'Create a detailed plan before execution',
  parameters: z.object({
    question: z.string(),
    steps: z.array(z.string()),
    toolsToUse: z.array(z.string()),
    estimatedToolCalls: z.number(),
    needsExternalData: z.boolean(),
    rationale: z.string()
  })
}

// Agent MUST call this first
// Provides transparency to users
// Enables budget-aware execution
```

#### 2. searchProjectData - Vector Search

```typescript
{
  name: 'searchProjectData',
  description: 'Search project documents using semantic similarity',
  parameters: z.object({
    query: z.string(),
    maxResults: z.number().min(1).max(10).default(2)
  }),

  execute: async (projectId, query, maxResults) => {
    // High-precision vector search
    const results = await vectorSearch({
      query,
      limit: maxResults,
      numCandidates: maxResults * 75,
      threshold: 0.6  // Agent mode uses stricter threshold
    });

    // Return concise results
    return results.map(r => ({
      id: r._id.toString(),
      filename: r.metadata.filename,
      description: r.analysis.description,
      tags: r.analysis.tags,
      score: r.score
    }));
  }
}
```

#### 3. searchSimilarItems - Find Related Content

```typescript
{
  name: 'searchSimilarItems',
  description: 'Find documents similar to a specific item',
  parameters: z.object({
    dataId: z.string(),
    maxResults: z.number().default(3)
  }),

  execute: async (projectId, dataId, maxResults) => {
    // Get the source document's embedding
    const sourceDoc = await db.collection('projectData')
      .findOne({ _id: new ObjectId(dataId) });

    // Search using the embedding directly
    return await vectorSearchByEmbedding(
      sourceDoc.embedding,
      { exclude: dataId, limit: maxResults }
    );
  }
}
```

#### 4. analyzeImage - Context-Aware Visual Analysis

```typescript
{
  name: 'analyzeImage',
  description: 'Analyze an image with user question context',
  parameters: z.object({
    dataId: z.string(),
    specificQuestion: z.string().optional()
  }),

  execute: async (projectId, dataId, question) => {
    // Fetch image
    const doc = await db.collection('projectData')
      .findOne({ _id: new ObjectId(dataId) });

    // Compress for efficiency
    const compressed = await compressImage(
      doc.content.base64,
      doc.metadata.mimeType
    );

    // Build context-aware prompt
    const prompt = `Analyze this image "${doc.metadata.filename}"

    Project: ${project.name}
    Context: ${project.description}

    User Question: ${question}

    Focus your analysis on aspects relevant to the question.
    Be specific about data, trends, and visual elements.`;

    // LLM analysis with context
    return await analyzewithLLM(compressed.base64, prompt);
  }
}
```

#### 5. projectDataAnalysis - Fast Analysis Retrieval

```typescript
{
  name: 'projectDataAnalysis',
  description: 'Get stored analysis without re-analyzing',
  parameters: z.object({
    dataId: z.string()
  }),

  execute: async (projectId, dataId) => {
    // Fast retrieval of cached analysis
    const doc = await db.collection('projectData')
      .findOne(
        { _id: new ObjectId(dataId) },
        { projection: { analysis: 1, metadata: 1 } }
      );

    return {
      filename: doc.metadata.filename,
      analysis: doc.analysis
    };
  }
}

// Use this when analysis exists and no new context needed
// Much faster than analyzeImage (no LLM call, no base64 transfer)
```

### External Tools (Feature-Flagged)

#### 6. searchWeb - Perplexity AI Integration

```typescript
{
  name: 'searchWeb',
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string(),
    maxResults: z.number().default(5)
  }),

  // Only available if PERPLEXITY_API_KEY is set
  enabled: process.env.AGENT_WEB_SEARCH_ENABLED === 'true',

  execute: async (query, maxResults) => {
    const response = await perplexity.chat({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{
        role: 'user',
        content: `Search for: ${query}. Provide ${maxResults} most relevant results with citations.`
      }]
    });

    return {
      answer: response.choices[0].message.content,
      citations: response.citations,
      timestamp: new Date().toISOString()
    };
  }
}

// Environment configuration:
// PERPLEXITY_API_KEY=your-key
// AGENT_WEB_SEARCH_ENABLED=true
```

#### 7. sendEmail - Resend Integration

```typescript
{
  name: 'sendEmail',
  description: 'Send email with research findings',
  parameters: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
    attachmentIds: z.array(z.string()).optional()
  }),

  // Only available if EMAIL_API_KEY is set
  enabled: process.env.EMAIL_ENABLED === 'true',

  execute: async (to, subject, body, attachmentIds) => {
    // Convert attachments to base64
    const attachments = await prepareAttachments(attachmentIds);

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: body,
      attachments
    });

    return {
      success: true,
      messageId: result.id,
      timestamp: new Date().toISOString()
    };
  }
}

// Environment configuration:
// EMAIL_API_KEY=your-resend-key
// EMAIL_FROM=noreply@yourdomain.com
// EMAIL_ENABLED=true
```

## Reference Tracking: Bidirectional Provenance

One of our most powerful features is **bidirectional reference tracking** between conversations and data sources.

### How It Works

```typescript
// 1. During agent execution, track which data items are used
const references = [];

for (const toolResult of toolResults) {
  if (toolResult.tool === 'searchProjectData') {
    // Extract references from search results
    for (const item of toolResult.output.results) {
      references.push({
        type: 'projectData',
        dataId: item.id,
        title: item.filename,
        usedInStep: toolResult.step,
        toolCall: 'searchProjectData',
        score: item.score
      });
    }
  }

  if (toolResult.tool === 'analyzeImage') {
    references.push({
      type: 'projectData',
      dataId: toolResult.input.dataId,
      title: toolResult.output.filename,
      usedInStep: toolResult.step,
      toolCall: 'analyzeImage'
    });
  }

  if (toolResult.tool === 'searchWeb') {
    for (const citation of toolResult.output.citations) {
      references.push({
        type: 'web',
        url: citation.url,
        title: citation.title,
        usedInStep: toolResult.step,
        toolCall: 'searchWeb'
      });
    }
  }
}

// 2. Save references with the conversation
await db.collection('conversations').insertOne({
  projectId,
  sessionId,
  message: { role: 'assistant', content: finalAnswer },
  plan: agentPlan,
  references,  // Forward references
  toolExecutions,
  timestamp: new Date()
});

// 3. Update projectData with backward references
for (const ref of references.filter(r => r.type === 'projectData')) {
  await db.collection('projectData').updateOne(
    { _id: new ObjectId(ref.dataId) },
    {
      $push: {
        referencedBy: {  // Backward reference
          conversationId: conversationId,
          sessionId,
          timestamp: new Date(),
          context: userQuestion,
          toolCall: ref.toolCall
        }
      }
    }
  );
}
```

### Benefits of Bidirectional Tracking

1. **From Conversation → Data**: See which sources supported an answer
2. **From Data → Conversations**: See all times a document was referenced
3. **Usage Analytics**: Identify most/least used documents
4. **Quality Metrics**: Correlate document usage with answer quality
5. **Audit Trail**: Complete provenance for compliance

### API Endpoints

```typescript
// View references for a specific data item
GET /api/projects/data/[id]/references

Response: {
  dataItem: {
    _id: "...",
    filename: "Q3_Revenue_Chart.jpg",
    analysis: {...}
  },
  conversations: [
    {
      _id: "...",
      message: "What were Q3 revenue trends?",
      timestamp: "2025-01-15T10:30:00Z",
      toolCall: "analyzeImage"
    },
    {
      _id: "...",
      message: "Compare Q3 to Q2 performance",
      timestamp: "2025-01-16T14:20:00Z",
      toolCall: "searchProjectData"
    }
  ]
}
```

## Tool Execution Tracking: Detailed Performance Metrics

Every tool call is tracked with comprehensive metadata:

```typescript
interface ToolExecution {
  step: number;           // Sequential step number
  tool: string;           // Tool name
  input: object;          // Tool parameters
  output: unknown;        // Tool result
  duration: number;       // Execution time in milliseconds
  tokens?: number;        // Token usage (if applicable)
  timestamp: Date;        // When executed
}

// Saved with every conversation
await db.collection('conversations').updateOne(
  { _id: conversationId },
  {
    $set: {
      toolExecutions: [
        {
          step: 1,
          tool: 'planQuery',
          input: { question: "..." },
          output: { steps: [...], estimatedToolCalls: 5 },
          duration: 245,
          timestamp: new Date('2025-01-15T10:30:00Z')
        },
        {
          step: 2,
          tool: 'searchProjectData',
          input: { query: "Q3 revenue", maxResults: 2 },
          output: { results: [...] },
          duration: 1834,
          timestamp: new Date('2025-01-15T10:30:02Z')
        },
        {
          step: 3,
          tool: 'analyzeImage',
          input: { dataId: "...", specificQuestion: "..." },
          output: { analysis: "..." },
          duration: 3421,
          tokens: 1547,
          timestamp: new Date('2025-01-15T10:30:06Z')
        }
      ]
    }
  }
);
```

### Agent Analytics API

```typescript
GET /api/agent/analytics?projectId=xxx&startDate=xxx&endDate=xxx

Response: {
  toolUsage: {
    planQuery: { count: 45, avgDuration: 234, totalDuration: 10530 },
    searchProjectData: { count: 89, avgDuration: 1823, totalDuration: 162247 },
    analyzeImage: { count: 67, avgDuration: 3245, totalDuration: 217415 },
    searchWeb: { count: 23, avgDuration: 2156, totalDuration: 49588 }
  },

  stepBudget: {
    average: 4.2,
    min: 2,
    max: 7,
    distribution: {
      "2": 5,
      "3": 12,
      "4": 34,
      "5": 28,
      "6": 8,
      "7": 3
    }
  },

  planAccuracy: {
    avgEstimated: 4.8,
    avgActual: 4.2,
    deviation: 0.6,
    underestimated: 23,
    overestimated: 45,
    accurate: 22
  },

  references: {
    total: 234,
    byType: {
      projectData: 189,
      web: 45,
      email: 0
    },
    topItems: [
      { dataId: "...", filename: "Q3_Report.pdf", timesReferenced: 34 },
      { dataId: "...", filename: "Market_Analysis.jpg", timesReferenced: 28 }
    ]
  },

  insights: {
    mostUsedTool: "searchProjectData",
    slowestTool: "analyzeImage",
    planningAdoptionRate: 0.95,  // 95% of conversations used planning
    externalDataUsageRate: 0.26   // 26% needed web search
  }
}
```

## Service Layer Architecture: DRY Principle in Action

One of our key architectural decisions was creating a **centralized service layer** to eliminate code duplication.

### Before: Code Duplication

```typescript
// Route: /api/projects/data/[id]/analyze
export async function POST(req: Request) {
  const { id } = req.params;
  const db = await getDb();

  // 67 lines of duplicate logic
  const doc = await db.collection('projectData').findOne(...);
  const compressed = await compressImage(...);
  const llmProvider = process.env.LLM_FOR_ANALYSIS;
  const analysis = llmProvider === 'claude'
    ? await claudeAnalyze(...)
    : await openaiAnalyze(...);
  await db.collection('projectData').updateOne(...);
  // ... more logic
}

// Route: /api/projects/[projectId]/data/analyze
export async function POST(req: Request) {
  const { projectId } = req.params;
  const { dataIds } = await req.json();

  // 32 lines of duplicate logic (same as above)
  for (const id of dataIds) {
    const doc = await db.collection('projectData').findOne(...);
    const compressed = await compressImage(...);
    const llmProvider = process.env.LLM_FOR_ANALYSIS;
    // ... duplicate code
  }
}
```

### After: Service Layer

```typescript
// Service: lib/services/projectData.service.ts
export async function analyzeImageItem(
  db: Db,
  itemId: string
): Promise<ProjectData> {
  // Single source of truth (20 lines)
  const doc = await getProjectDataItem(db, itemId);
  validateItemType(doc, 'image');

  const compressed = await compressImage(
    doc.content.base64,
    doc.metadata.mimeType
  );

  const provider = getLLMProvider();  // Respects LLM_FOR_ANALYSIS
  const analysis = await analyzeWithLLM(provider, compressed, doc.metadata);

  return await updateItemAnalysis(db, itemId, analysis);
}

// Routes become thin controllers
// Route: /api/projects/data/[id]/analyze
export async function POST(req: Request) {
  const { id } = req.params;
  const db = await getDb();

  try {
    const result = await analyzeImageItem(db, id);
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleError(error);
  }
}

// Route: /api/projects/[projectId]/data/analyze
export async function POST(req: Request) {
  const { projectId } = req.params;
  const { dataIds } = await req.json();
  const db = await getDb();

  try {
    const result = await bulkAnalyzeImages(db, projectId, dataIds);
    return Response.json({ success: true, data: result });
  } catch (error) {
    return handleError(error);
  }
}
```

### Service Layer Benefits

1. **~80% Code Reduction** in route handlers
2. **Single Source of Truth** for business logic
3. **Consistent Behavior** across all endpoints
4. **Easier Testing** - test services, not routes
5. **Centralized Configuration** - LLM selection, search strategies, etc.

### Service Modules

```
lib/services/
├── projectData.service.ts      # Data operations
│   ├── analyzeImageItem()
│   ├── processItemEmbedding()
│   ├── bulkAnalyzeImages()
│   └── bulkProcessEmbeddings()
│
├── vectorSearch.service.ts     # Unified vector search
│   ├── performVectorSearch()
│   ├── paginatedVectorSearch()
│   └── vectorSearchWithAnalysis()
│
├── references.service.ts       # Bidirectional tracking
│   ├── extractReferencesFromToolResults()
│   ├── updateConversationWithReferences()
│   └── updateProjectDataReferences()
│
├── perplexity.service.ts      # Web search
│   ├── searchWeb()
│   ├── isPerplexityEnabled()
│   └── formatSearchResults()
│
└── email.service.ts           # Email sending
    ├── sendEmail()
    ├── isEmailEnabled()
    └── createEmailConfirmationPrompt()
```

## User Experience: Agent-Centric Workflow

Our UI is designed around the agent as the primary interaction point:

### Two-Column Layout

```
┌────────────────────────────────────────────────────────┐
│  ← Back to Projects          Project: Q3 Financial     │
├──────────────────┬─────────────────────────────────────┤
│  Side Panel      │  Main Agent View                    │
│  (384px)         │  (Flexible)                         │
│                  │                                     │
│  [Search] [Browse] [Upload]                           │
│                  │  ┌─────────────────────────────┐   │
│  Search: "Q3"    │  │  Execution Plan             │   │
│  ─────────────   │  │  ✓ Search for Q3 reports    │   │
│                  │  │  ⟳ Analyze revenue chart    │   │
│  ☐ Q3_Report.pdf │  │  ⋯ Compare with targets     │   │
│  ☑ Revenue.jpg   │  │  ⋯ Synthesize findings      │   │
│  ☐ Expenses.xlsx │  │  (Step 2 of 5)              │   │
│                  │  └─────────────────────────────┘   │
│  [2 items        │                                     │
│   selected]      │  Agent Response:                    │
│                  │  "Based on the Q3 revenue chart..." │
│  [Feed to Agent] │                                     │
│                  │  Sources Used:                      │
│                  │  • Revenue.jpg (score: 0.87)        │
│                  │  • Q3_Report.pdf (score: 0.82)      │
│                  │                                     │
│                  │  [Ask a follow-up question...]      │
└──────────────────┴─────────────────────────────────────┘
```

### Key UX Features

#### 1. Multi-Select Workflow

```typescript
// SelectionContext provides global state
const { selectedItems, addItem, removeItem, clearSelection, feedToAgent } =
  useSelection();

// Users can select items from Search or Browse
<Checkbox
  checked={selectedItems.includes(item._id)}
  onChange={() => toggleSelection(item._id)}
/>

// Selected items appear in Selection Tray
<SelectionTray items={selectedItems} onFeedToAgent={feedToAgent} />

// Agent receives selected items as context
const agentPrompt = `
  User Question: ${userMessage}

  Provided Context:
  ${selectedItems.map(item => `
    File: ${item.filename}
    Description: ${item.analysis.description}
    Tags: ${item.analysis.tags.join(', ')}
  `).join('\n')}

  Use the provided context to answer the question.
`;
```

#### 2. Image Preview Modal

```typescript
// Eye icon opens full-screen modal
<button onClick={() => openImagePreview(item)}>
  <Eye className="w-4 h-4" />
</button>

// Modal features:
// - Full-screen view with zoom controls
// - Keyboard navigation (← → for multiple images)
// - Download button
// - ESC to close
// - Click outside to close

<ImagePreviewModal
  images={images}
  currentIndex={currentIndex}
  onClose={() => setIsOpen(false)}
  onNavigate={(direction) => navigate(direction)}
/>
```

#### 3. Plan Visualization

```typescript
// PlanCard shows agent's strategy
<PlanCard plan={currentPlan}>
  <div className="space-y-2">
    {plan.steps.map((step, index) => (
      <div key={index} className="flex items-center gap-2">
        {getStepStatus(index, currentStep)}
        <span>{step}</span>
      </div>
    ))}
  </div>

  <div className="mt-4 text-sm text-muted-foreground">
    Tools: {plan.toolsToUse.join(', ')}
    Budget: {plan.estimatedToolCalls} steps
    {plan.needsExternalData && ' (includes web search)'}
  </div>
</PlanCard>
```

#### 4. Step Progress Tracker

```typescript
// Real-time progress during execution
<StepProgressTracker
  currentStep={currentStep}
  maxSteps={maxSteps}
  toolExecutions={toolExecutions}
>
  <ProgressBar value={(currentStep / maxSteps) * 100} />

  <div className="space-y-2">
    {toolExecutions.map(exec => (
      <div key={exec.step} className="flex justify-between">
        <span>Step {exec.step}: {exec.tool}</span>
        <span>{exec.duration}ms</span>
      </div>
    ))}
  </div>
</StepProgressTracker>
```

#### 5. References Panel

```typescript
// Expandable panel showing all sources
<ReferencesPanel references={references}>
  <Tabs>
    <TabsList>
      <Tab>Project Data ({projectDataRefs.length})</Tab>
      <Tab>Web Sources ({webRefs.length})</Tab>
    </TabsList>

    <TabContent value="projectData">
      {projectDataRefs.map(ref => (
        <ReferenceCard
          key={ref.dataId}
          title={ref.title}
          score={ref.score}
          usedInStep={ref.usedInStep}
          onClick={() => openItemDetails(ref.dataId)}
        />
      ))}
    </TabContent>

    <TabContent value="web">
      {webRefs.map(ref => (
        <ReferenceCard
          key={ref.url}
          title={ref.title}
          url={ref.url}
          usedInStep={ref.usedInStep}
          onClick={() => window.open(ref.url, '_blank')}
        />
      ))}
    </TabContent>
  </Tabs>
</ReferencesPanel>
```

#### 6. Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + B: Toggle side panel
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidePanel();
    }

    // Cmd/Ctrl + Shift + F: Focus mode
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault();
      enterFocusMode();
    }

    // Escape: Exit focus mode
    if (e.key === 'Escape' && focusMode) {
      exitFocusMode();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [focusMode]);
```

## Environment Configuration: Feature Flags and Flexibility

Our application uses environment variables for maximum flexibility:

### Required Configuration

```bash
# MongoDB Atlas (M10+ for vector search)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/test

# VoyageAI (1024-dim multimodal embeddings)
VOYAGE_API_KEY=your-voyage-key

# Anthropic (primary LLM for analysis and chat)
ANTHROPIC_API_KEY=your-anthropic-key
```

### LLM Provider Selection

```bash
# Choose between Claude and OpenAI for visual analysis
LLM_FOR_ANALYSIS=claude  # or "openai"

# Models used:
# - Claude: claude-haiku-4-5-20251001 (fast, cost-effective)
# - OpenAI: gpt-5-nano-2025-08-07 (alternative)

# OpenAI API key (only if using openai for analysis)
OPENAI_API_KEY=your-openai-key
```

### Agent External Tools (Feature Flags)

```bash
# Web Search via Perplexity AI
PERPLEXITY_API_KEY=your-perplexity-key
AGENT_WEB_SEARCH_ENABLED=true  # false to disable

# Email via Resend
EMAIL_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_ENABLED=true  # false to disable

# Planning Phase
AGENT_PLANNING_ENABLED=true  # false to disable (not recommended)
```

### LangSmith Tracing (Optional)

```bash
# Debug agent behavior with LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-key
LANGCHAIN_PROJECT=mongo-multimodal

# View traces at: https://smith.langchain.com/
```

### Advanced Document Parsing (Optional)

```bash
# Unstructured.io for complex document parsing
UNSTRUCTURED_API_URL=http://localhost:8000
UNSTRUCTURED_API_KEY=  # Empty for self-hosted without auth
```

## Performance Optimizations

### 1. Image Compression

```typescript
// Reduce token usage by 60-80%
const compressed = await compressImage(base64, mimeType, {
  maxDimension: 768,    // Max width/height
  quality: 85,          // JPEG quality
  format: 'jpeg'        // Convert PNG to JPEG
});

// Before: 1024px image = ~1700 tokens
// After:  768px image = ~765 tokens (55% reduction)
```

### 2. Vector Search Strategies

```typescript
// Different strategies for different use cases
const strategies = {
  // Search Mode: Fast, broad results for user exploration
  search: {
    limit: 200,           // Show many results
    numCandidates: 800,   // Wide search space
    threshold: 0.3        // Inclusive matching
  },

  // Agent Mode: Precise, focused results for reasoning
  agent: {
    limit: 2,             // Few, highly relevant results
    numCandidates: 150,   // Narrower search space
    threshold: 0.6        // Strict matching
  }
};
```

### 3. Lazy Loading

```typescript
// Don't load base64 unless needed
const getItemContent = async (db: Db, itemId: string) => {
  // projectDataAnalysis tool: No base64
  const lightData = await db.collection('projectData').findOne(
    { _id: new ObjectId(itemId) },
    { projection: { analysis: 1, metadata: 1 } }  // Exclude base64
  );

  // analyzeImage tool: Load base64 only when analyzing
  const fullData = await db.collection('projectData').findOne(
    { _id: new ObjectId(itemId) },
    { projection: { content: 1, metadata: 1 } }  // Include base64
  );
};
```

### 4. Conversation Storage

```typescript
// Strip base64 before saving conversations (avoid 16MB limit)
const cleanMessage = (message: Message) => {
  if (message.content && typeof message.content === 'string') {
    // Remove base64 data URLs
    return {
      ...message,
      content: message.content.replace(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
        '[image removed]'
      )
    };
  }
  return message;
};

await db.collection('conversations').insertOne({
  ...conversation,
  message: cleanMessage(conversation.message),
  contentCleaned: true
});
```

### 5. HMR-Safe Database Connection

```typescript
// Prevent connection pool exhaustion in development
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Use global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = MongoClient.connect(uri, options);
  }
  clientPromise = global._mongoClientPromise;
} else {
  // Production: Normal connection
  clientPromise = MongoClient.connect(uri, options);
}
```

## Real-World Use Cases

### Financial Services: Quarterly Analysis

```
User: "Compare our Q3 revenue performance with industry benchmarks"

Agent Plan:
1. Search project for Q3 revenue reports and charts
2. Analyze key metrics from financial visualizations
3. Search web for Q3 industry performance data
4. Compare our performance to industry averages
5. Synthesize findings with recommendations

Execution:
Step 1: searchProjectData("Q3 revenue charts") → 2 results
Step 2: analyzeImage(revenue_chart.jpg) → Extract metrics
Step 3: searchWeb("Q3 2024 financial services industry performance")
Step 4: (Internal comparison logic)
Step 5: Synthesis response

Result:
"Based on your Q3 revenue chart showing 23% growth (Revenue.jpg),
compared to the industry average of 15% (Source: Industry Report 2024),
your performance exceeded benchmarks by 8 percentage points.
Key drivers include..."

Sources:
• Q3_Revenue_Chart.jpg (internal, score: 0.89)
• Q3_Full_Report.pdf (internal, score: 0.78)
• https://industry-analysis.com/q3-2024 (web)
```

### Manufacturing: Defect Pattern Analysis

```
User: "Find similar defect patterns to this bearing failure"
[User selects defect image in side panel]

Agent Plan:
1. Analyze the provided defect image in detail
2. Search for similar defect patterns in quality reports
3. Retrieve past maintenance resolutions for similar cases
4. Summarize patterns and recommended actions

Execution:
Step 1: analyzeImage(selected_defect.jpg, "bearing defect analysis")
Step 2: searchSimilarItems(selected_defect_id) → 3 similar cases
Step 3: projectDataAnalysis(maintenance_log_id) for each case
Step 4: Synthesis

Result:
"The bearing shows radial cracking consistent with fatigue failure.
I found 3 similar historical cases:

1. Equipment #2847 (2024-08-15) - Same radial pattern
   Resolution: Replaced bearing, upgraded lubrication schedule

2. Equipment #3021 (2024-06-22) - Similar stress marks
   Resolution: Reduced operating temperature, preventive replacement

3. Equipment #2956 (2024-04-10) - Matching wear indicators
   Resolution: Implemented vibration monitoring

Recommendation: Replace bearing, review lubrication system,
and consider vibration monitoring for early detection."

Sources:
• Defect_2847_Bearing.jpg (score: 0.92)
• Maintenance_Log_Aug_2024.pdf (score: 0.86)
• Defect_3021_Analysis.pdf (score: 0.84)
```

### Healthcare: Research Literature Review

```
User: "What do our research documents say about drug interactions
      with compound XYZ?"

Agent Plan:
1. Search internal research documents for compound XYZ
2. Analyze key findings from research papers and lab reports
3. Search web for recent published studies on compound XYZ
4. Cross-reference internal and external findings
5. Summarize interaction profiles

Execution:
Step 1: searchProjectData("compound XYZ drug interactions") → 2 docs
Step 2: analyzeImage(molecular_structure.jpg) +
        projectDataAnalysis(research_paper_id)
Step 3: searchWeb("compound XYZ drug interactions clinical studies 2024")
Step 4: (Cross-reference logic)
Step 5: Synthesis

Result:
"Based on internal research and current literature:

Internal Findings:
• Lab Report #2024-089: Observed moderate CYP3A4 inhibition
• Research Paper (Dr. Smith): No significant interactions with
  common cardiovascular drugs

External Research:
• Clinical Trial (2024): Confirmed CYP3A4 interaction, recommends
  dose adjustment with metabolized drugs
• Review Article: Highlights potential interaction with Drug Class B

Recommendation: Exercise caution with CYP3A4-metabolized drugs.
Further clinical validation recommended."

Sources:
• Lab_Report_2024-089.pdf (internal, score: 0.91)
• Research_Paper_Smith.pdf (internal, score: 0.85)
• https://clinicaltrials.gov/study/NCT... (web)
• https://pubmed.ncbi.nlm.nih.gov/... (web)
```

## Production Deployment Checklist

### 1. Infrastructure Setup

```bash
# MongoDB Atlas
☐ Create M10+ cluster for vector search
☐ Configure IP whitelist (or 0.0.0.0/0 for cloud)
☐ Create database user with read/write access
☐ Create vector search index named "vector_index"
☐ Set up automated backups

# Vercel (Recommended)
☐ Install Vercel CLI: npm i -g vercel
☐ Connect GitHub repository
☐ Configure environment variables
☐ Set up production domain
☐ Enable Edge Functions for agent endpoints
```

### 2. Environment Variables

```bash
# Required
☑ MONGODB_URI
☑ VOYAGE_API_KEY
☑ ANTHROPIC_API_KEY

# Optional but Recommended
☑ OPENAI_API_KEY (fallback LLM)
☑ LLM_FOR_ANALYSIS (claude/openai)

# Feature Flags (as needed)
☑ PERPLEXITY_API_KEY + AGENT_WEB_SEARCH_ENABLED
☑ EMAIL_API_KEY + EMAIL_FROM + EMAIL_ENABLED
☑ AGENT_PLANNING_ENABLED

# Monitoring (recommended for production)
☑ LANGCHAIN_TRACING_V2=true
☑ LANGCHAIN_API_KEY
☑ LANGCHAIN_PROJECT
```

### 3. Security Hardening

```bash
☐ Add authentication middleware (NextAuth, Clerk, etc.)
☐ Implement rate limiting on API routes
☐ Add CORS configuration for production domain
☐ Enable HTTPS only
☐ Validate all file uploads (size, type, content)
☐ Sanitize user inputs
☐ Implement API key rotation policy
☐ Set up monitoring and alerting
☐ Configure CSP headers
☐ Enable audit logging
```

### 4. Performance Optimization

```bash
☐ Enable Next.js image optimization
☐ Configure CDN for static assets
☐ Set up Redis caching for frequent queries
☐ Implement connection pooling for MongoDB
☐ Use Edge Functions for low-latency regions
☐ Enable compression middleware
☐ Configure proper cache headers
☐ Monitor and optimize slow queries
```

### 5. Monitoring and Observability

```bash
☐ Set up application monitoring (Vercel Analytics)
☐ Configure error tracking (Sentry)
☐ Monitor API endpoint latency
☐ Track vector search performance
☐ Monitor LLM API usage and costs
☐ Set up alerts for failures
☐ Track agent tool usage analytics
☐ Monitor database performance
```

## Cost Optimization Strategies

### 1. LLM Selection

```typescript
// Use Claude Haiku for most tasks (fast + cheap)
LLM_FOR_ANALYSIS=claude

// Claude Haiku pricing (approximate):
// - Input: $0.25 / 1M tokens
// - Output: $1.25 / 1M tokens
// - Image: ~765 tokens per 768px image (after compression)

// Cost per image analysis:
// - Input tokens: ~765 (image) + ~100 (prompt) = ~865 tokens
// - Output tokens: ~200-500 tokens
// - Cost: ~$0.0002 - $0.0004 per image
```

### 2. Image Compression

```typescript
// Aggressive compression for cost savings
const compressImage = (base64: string, mimeType: string) => {
  return sharp(Buffer.from(base64, 'base64'))
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })  // 85% quality = minimal visual loss
    .toBuffer();
};

// Savings: 55-80% reduction in token usage
```

### 3. Caching Strategy

```typescript
// Cache analysis results
const getCachedAnalysis = async (contentHash: string) => {
  // Check if we've analyzed this exact image before
  const cached = await db.collection('analysisCache').findOne({
    contentHash,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });

  if (cached) return cached.analysis;

  // Not cached, analyze and save
  const analysis = await analyzeWithLLM(...);
  await db.collection('analysisCache').insertOne({
    contentHash,
    analysis,
    createdAt: new Date()
  });

  return analysis;
};
```

### 4. Tool Usage Optimization

```typescript
// Use projectDataAnalysis instead of analyzeImage when possible
// projectDataAnalysis: No LLM call, instant, free
// analyzeImage: LLM call, 3-4 seconds, $0.0002-$0.0004

// Only use analyzeImage when:
// 1. User has a specific question about the image
// 2. No cached analysis exists
// 3. Need context-aware analysis
```

### 5. Web Search Limits

```typescript
// Limit web search usage (external API costs)
const shouldSearchWeb = (plan: AgentPlan) => {
  // Only search web if:
  // 1. User explicitly asks for current/external info
  // 2. Project data search returned no results
  // 3. Question requires external knowledge
  return plan.needsExternalData &&
         !hasRecentWebSearch(sessionId) &&
         internalSearchFailed;
};
```

## Conclusion: The Future of Enterprise AI

We've built more than a search engine—we've created an **intelligent research assistant** that:

1. **Understands Visual Content**: Analyzes charts, diagrams, and images as naturally as text
2. **Plans Before Acting**: Shows its strategy transparently before execution
3. **Manages Complexity**: Handles multi-step reasoning within budget constraints
4. **Tracks Provenance**: Maintains complete audit trails of sources and decisions
5. **Adapts and Learns**: Uses tool execution metrics to improve over time

### Key Takeaways

**For Developers:**
- Service layer architecture eliminates code duplication
- Feature flags enable flexible deployment
- Bidirectional reference tracking provides complete provenance
- LangGraph-inspired agents offer powerful reasoning capabilities

**For Product Teams:**
- Agent-centric UI puts AI front and center
- Planning phase builds user trust through transparency
- Multi-select workflow bridges search and chat seamlessly
- Analytics enable data-driven product improvements

**For Enterprises:**
- Multi-modal vector search unlocks visual data
- MongoDB Atlas provides production-scale infrastructure
- Tool execution tracking enables ROI measurement
- External integrations extend capabilities (web search, email)

### What's Next?

This architecture enables exciting future enhancements:

1. **Real-time Video Analysis**: Search live feeds by content
2. **3D Model Search**: Find CAD files by sketching shapes
3. **Voice Interface**: Ask questions verbally
4. **Collaborative Agents**: Multiple specialized agents working together
5. **Predictive Insights**: AI anticipates information needs
6. **Cross-Language Search**: Break down language barriers automatically

### Getting Started

The complete source code, documentation, and deployment guides are available in the repository. Whether you're building a financial analysis platform, manufacturing knowledge base, healthcare research tool, or general enterprise search, this architecture provides a solid foundation.

Start small with a pilot project, measure the impact, and scale from there. The combination of MongoDB Atlas Vector Search, modern AI models, and thoughtful UX design creates a powerful solution that truly transforms how organizations work with their data.

---

**Ready to build your own intelligent agent?**

- GitHub: https://github.com/your-repo/mongo-multimodal
- MongoDB Atlas: https://www.mongodb.com/products/platform/atlas-vector-search
- VoyageAI: https://www.voyageai.com/
- Anthropic Claude: https://www.anthropic.com/
- Vercel AI SDK: https://sdk.vercel.ai/

*Built with MongoDB Atlas Vector Search, Claude AI, VoyageAI, LangGraph, and Next.js 15*
