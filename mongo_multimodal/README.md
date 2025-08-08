# MongoDB Multi-Modal Vector Search Application

A powerful enterprise-grade application that enables semantic search across visual and textual data using MongoDB Atlas Vector Search, LangGraph, and the Vercel AI SDK. Transform your charts, diagrams, PDFs, and images into searchable knowledge and interact with it through a powerful AI agent.

## 🚀 Features

- **Three Modes of Interaction**:
  - **Search Mode**: Perform direct, paginated vector searches and view results instantly.
  - **Chat Mode**: Engage in a conversational Q&A with your data.
  - **Agent Mode**: Ask complex questions that require planning, tool use, and web search.
- **AI-Powered Agent**: A LangGraph-powered agent that can reason, plan, and use tools to answer complex queries.
- **Multi-Modal Search**: Search across images, PDFs, and documents using natural language or visual queries.
- **AI-Powered Analysis**: Claude AI analyzes visual content and extracts meaningful insights.
- **Vector Embeddings**: VoyageAI generates 1024-dimensional embeddings for semantic similarity.
- **MongoDB Atlas Integration**: Scalable vector search with MongoDB's native capabilities.
- **Project Organization**: Group related documents into searchable projects.

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with M10+ cluster (required for vector search)
- API Keys:
  - [Anthropic Claude API key](https://console.anthropic.com/)
  - [VoyageAI API key](https://dash.voyageai.com/)
  - [BraveSearch API key](https://brave.com/search/api/) for the agent's web search tool (FREE).
  - [LangSmith API key](https://smith.langchain.com/) for tracing and debugging the agent (optional).
  - [OpenAI API key](https://platform.openai.com/) (optional)

## 🛠️ Installation

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
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/multimodal?retryWrites=true&w=majority

# AI Service API Keys
VOYAGE_API_KEY=your-voyage-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
BRAVE_SEARCH_API_KEY=your-brave-search-api-key
OPENAI_API_KEY=your-openai-api-key  # Optional

# Agent Mode Configuration (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_PROJECT=your-project-name # Optional: Helps organize runs in LangSmith

# LLM Provider Selection
LLM_FOR_ANALYSIS=claude  # Options: "claude" or "openai"

# Application URL (for local development)
VERCEL_URL=http://localhost:3000
```

### 4. MongoDB Atlas Setup

#### Create Vector Search Index

You can create the vector search index in two ways:

**Option 1: Using the Script (Recommended)**
Run the provided script after setting up your environment:
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
5. Select the database: `multimodal` (or your database name)
6. Select the collection: `projectData`

**Note**: Vector search requires MongoDB Atlas M10 tier or higher.

### 5. Initialize the Database

```bash
# Test database connection
npm run test:db

# Create vector search indexes
npm run create:index
```

## 🚦 Getting Started

### Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Complete Usage Flow

### Step 1: Create a Project

1. Navigate to the homepage
2. Click "New Project" button
3. Fill in the project details:
   - **Name**: e.g., "Q4 Financial Reports"
   - **Description**: e.g., "Quarterly financial charts and analysis documents"
4. Click "Create Project"

### Step 2: Upload Documents

1. Open your newly created project
2. Click the "Upload Files" button
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
- Analyzing images/PDFs with Claude AI
- Generating vector embeddings with VoyageAI
- Extracting metadata and insights

### Step 4: Interact with Your Data

Within a project, you can interact with your data in three different modes using the tabbed interface:

#### Search Mode
- **What it is**: A direct, fast vector search of your project's data.
- **How to use**: Enter a query in the search bar and get a paginated list of the most relevant documents and images.
- **Example**: Search for "all images of defective products" to quickly see all relevant images.

#### Chat Mode
- **What it is**: A conversational Q&A interface for your project.
- **How to use**: Ask questions in a natural, conversational way. The chat will maintain context.
- **Example**: Ask "What were the main findings in the Q3 report?" and then follow up with "Can you summarize the key takeaways?".

#### Agent Mode
- **What it is**: A powerful AI agent that can reason, create a plan, and use tools to answer complex questions.
- **How to use**: Ask high-level research questions. The agent will use vector search and web search to find the answer.
- **Example**: Ask "Compare the key findings of our internal reports on market trends with the latest articles on the web."

### Step 5: Interact with Results

- **View Details**: Click on any result to see full analysis
- **Image Preview**: Click the eye icon to view images in full size
- **Download**: Export search results for reporting
- **Refine Search**: Use follow-up questions in the chat

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   API Routes     │────▶│  MongoDB Atlas  │
│ (React UI, AI SDK)│     │  (LangGraph Agent) │     │  (Vector DB)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                      ▲
                               ▼                      │
                    ┌─────────────────────┐     ┌─────────┴─────────┐
                    │   AI Services       │     │       Tools       │
                    ├─────────────────────┤     ├───────────────────┤
                    │ • Claude AI         │     │ • Vector Search   │
                    │ • VoyageAI          │     │ • Web Search      │
                    │ • OpenAI (optional) │     │   (Tavily AI)     │
                    └─────────────────────┘     └───────────────────┘
```

## 📁 Project Structure

```
/app/                    # Next.js App Router
├── api/                 # Backend API routes
│   ├── agent/          # LangGraph agent endpoint
│   ├── chat/           # Vercel AI SDK chat endpoint
│   ├── projects/       # Project CRUD and search operations
│   └── ...
├── lib/                # Core utilities
│   ├── mongodb.ts      # Database connection
│   ├── claude.ts       # AI integrations
│   └── voyageai.ts     # Embedding generation
├── projects/           # Project UI pages
└── components/         # Reusable React components
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run test:db         # Test MongoDB connection
npm run create:index    # Create vector search indexes

# Code Quality
npm run lint            # Run ESLint
```

## 🎯 Use Cases

### Financial Services
- Search quarterly reports by chart patterns
- Find anomalies across financial visualizations
- Connect insights from multiple documents

### Manufacturing
- Locate technical diagrams by description
- Find similar defect patterns across quality reports
- Search equipment manuals with natural language

### Healthcare & Research
- Search medical images by visual similarity
- Find molecular structures across research papers
- Connect patient data with clinical insights

### Enterprise Knowledge Management
- Unified search across all visual assets
- Break down information silos
- Preserve institutional knowledge

## 🚀 Production Deployment

### Vercel Deployment

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

## 🔒 Security Best Practices

1. **API Keys**: Never commit API keys to version control
2. **MongoDB**: Use connection strings with authentication
3. **File Uploads**: Implement file size and type restrictions
4. **Access Control**: Add authentication for production use
5. **Data Privacy**: Ensure compliance with data regulations

## 🐛 Troubleshooting

### Common Issues

1. **"Vector index not found"**
   - Run `npm run create:index`
   - Ensure index name is `vector_index`

2. **"Failed to generate embeddings"**
   - Check VoyageAI API key
   - Verify API quota hasn't been exceeded

3. **"MongoDB connection failed"**
   - Verify connection string
   - Check IP whitelist in Atlas

4. **"File upload fails"**
   - Check file size (max 20MB for PDFs)
   - Ensure proper file format

## 📚 API Reference

### Search Endpoints

```typescript
// Global search
POST /api/search
{
  "query": "revenue charts Q3",
  "type": "text" | "image"
}

// Project-specific search
POST /api/projects/[projectId]/search
{
  "query": "manufacturing defects",
  "type": "text" | "image"
}
```

### File Upload

```typescript
// Upload file to project
POST /api/projects/[projectId]/upload
FormData: {
  file: File
}
```

### Process Documents

```typescript
// Generate embeddings for a document
POST /api/projects/data/[documentId]/process
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- MongoDB Atlas for vector search capabilities
- Anthropic for Claude AI
- VoyageAI for multimodal embeddings
- Next.js team for the amazing framework

## 📞 Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues](https://github.com/your-repo/mongo-multimodal/issues)
- Discord: [Join our community]

---

Built with ❤️ using MongoDB Atlas Vector Search