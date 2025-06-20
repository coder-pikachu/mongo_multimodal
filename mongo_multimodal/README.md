# MongoDB Multi-Modal Vector Search Application

A powerful enterprise-grade application that enables semantic search across visual and textual data using MongoDB Atlas Vector Search, Claude AI, and VoyageAI. Transform your charts, diagrams, PDFs, and images into searchable knowledge.

## 🚀 Features

- **Multi-Modal Search**: Search across images, PDFs, and documents using natural language or visual queries
- **AI-Powered Analysis**: Claude AI analyzes visual content and extracts meaningful insights
- **Vector Embeddings**: VoyageAI generates 1024-dimensional embeddings for semantic similarity
- **MongoDB Atlas Integration**: Scalable vector search with MongoDB's native capabilities
- **Real-time Processing**: Automatic embedding generation and content analysis
- **Project Organization**: Group related documents into searchable projects
- **Interactive Chat Interface**: Natural conversation with your visual data

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account with M10+ cluster (required for vector search)
- API Keys:
  - [Anthropic Claude API key](https://console.anthropic.com/)
  - [VoyageAI API key](https://dash.voyageai.com/)
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
OPENAI_API_KEY=your-openai-api-key  # Optional

# LLM Provider Selection
LLM_FOR_ANALYSIS=claude  # Options: "claude" or "openai"

# Application URL (for local development)
VERCEL_URL=http://localhost:3000
```

### 4. MongoDB Atlas Setup

#### Create Vector Search Index

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

### Step 4: Search Your Data

#### Project-Specific Search
Within a project, use the chat interface:

```
Example queries:
- "Show me revenue trends from Q3"
- "Find all charts showing growth patterns"
- "What are the key insights from the financial reports?"
```

#### Global Search
From the homepage, use the global search bar:

```
Example queries:
- "Find all manufacturing defect images across projects"
- "Show compliance charts from any department"
- "Locate molecular structures similar to compound X"
```

#### Visual Search
1. Click the image icon in the search bar
2. Upload or drag an image
3. The system finds visually and semantically similar content

### Step 5: Interact with Results

- **View Details**: Click on any result to see full analysis
- **Image Preview**: Click the eye icon to view images in full size
- **Download**: Export search results for reporting
- **Refine Search**: Use follow-up questions in the chat

## 🏗️ Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  API Routes      │────▶│  MongoDB Atlas  │
│   (React UI)    │     │  (Serverless)    │     │  (Vector DB)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   AI Services       │
                    ├─────────────────────┤
                    │ • Claude AI         │
                    │ • VoyageAI          │
                    │ • OpenAI (optional) │
                    └─────────────────────┘
```

## 📁 Project Structure

```
/app/                    # Next.js App Router
├── api/                 # Backend API routes
│   ├── projects/       # Project CRUD operations
│   ├── search/         # Global search endpoint
│   └── vector-search/  # Vector similarity search
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
npm run type-check      # Run TypeScript checks
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