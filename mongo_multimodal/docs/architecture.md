```mermaid
flowchart TB
    subgraph Frontend[Frontend - Next.js 14]
        UI[Client Browser]
        subgraph Pages[Pages/Components]
            PD[Project Dashboard]
            PV[Project View]
            UF[Upload Interface]
            SI[Search Interface]
        end
    end

    subgraph Backend[Backend - Next.js API Routes]
        API[API Layer]
        subgraph Endpoints[API Endpoints]
            PE[Projects API]
            PDE[Project Data API]
            UE[Upload API]
            SE[Search API]
        end
        
        subgraph Pipeline[Processing Pipeline]
            FP[File Processor]
            VG[Vector Generator]
            IA[Image Analyzer]
            SR[Search Router]
        end
    end

    subgraph External[External Services]
        VA[VoyageAI API]
        CL[Claude 3.5 Sonnet]
    end

    subgraph Database[Database - MongoDB Atlas]
        MDB[(MongoDB Atlas)]
        subgraph Collections[Collections]
            UC[(Users)]
            PC[(Projects)]
            PDC[(ProjectData)]
        end
    end

    %% Frontend to API Connections
    UI --> PD
    UI --> PV
    UI --> UF
    UI --> SI
    PD --> API
    PV --> API
    UF --> API
    SI --> API

    %% API to Processing Pipeline
    API --> PE
    API --> PDE
    API --> UE
    API --> SE
    UE --> FP
    FP --> VG
    VG --> VA
    FP --> IA
    IA --> CL
    SE --> SR
    SR --> VA

    %% Database Connections
    PE --> PC
    PDE --> PDC
    UE --> PDC
    SE --> PDC

    classDef frontend fill:#d4eaff,stroke:#333,stroke-width:2px
    classDef backend fill:#b7e3b7,stroke:#333,stroke-width:2px
    classDef external fill:#ffe6cc,stroke:#333,stroke-width:2px
    classDef database fill:#f2d9e6,stroke:#333,stroke-width:2px

    class UI,PD,PV,UF,SI frontend
    class API,PE,PDE,UE,SE,FP,VG,IA,SR backend
    class VA,CL external
    class MDB,UC,PC,PDC database

```

# Architecture Diagram Explanation

## Component Overview

### Frontend Layer
- **Client Browser**: Entry point for user interactions
- **Pages/Components**: Next.js 14 pages and components for different functionalities
  - Project Dashboard
  - Project View
  - Upload Interface
  - Search Interface

### Backend Layer
- **API Layer**: Next.js API routes handling various endpoints
- **Processing Pipeline**: 
  - File Processor: Handles file uploads and initial processing
  - Vector Generator: Creates embeddings using VoyageAI
  - Image Analyzer: Processes images using Claude
  - Search Router: Manages search requests and vector similarity

### External Services
- **VoyageAI API**: Generates embeddings for vector search
- **Claude 3.5 Sonnet**: Provides image analysis and response generation

### Database Layer
- **MongoDB Atlas**: Primary database with vector search capabilities
- **Collections**:
  - Users: Stores user information
  - Projects: Manages project metadata
  - ProjectData: Vector-enabled collection for processed data

## Data Flow

1. **Upload Flow**:
   - User uploads file → Upload Interface
   - File processed by File Processor
   - Vector Generator creates embeddings via VoyageAI
   - Image Analyzer processes with Claude
   - Data stored in ProjectData collection

2. **Search Flow**:
   - User inputs query → Search Interface
   - Search Router processes query
   - Vector embedding generated via VoyageAI
   - Vector search performed in MongoDB
   - Results processed and returned to user

## Key Features

- Vector search integration with MongoDB Atlas
- Real-time processing pipeline
- Scalable architecture
- Separation of concerns
- RESTful API design
