import { Node, Edge, MarkerType } from 'reactflow';

// Node details that will be shown on click
export const nodeDetails = {
  'client-web': {
    title: 'Web Client',
    description: 'React/Next.js frontend application',
    features: [
      'Progressive UI with real-time updates',
      'WebSocket support for live notifications',
      'Responsive design for all screen sizes',
      'PWA capabilities for offline access',
    ],
    technologies: ['Next.js 15', 'React 19', 'TailwindCSS', 'React Query'],
    metrics: ['Response time: <100ms', 'Bundle size: <500KB'],
  },
  'client-mobile': {
    title: 'Mobile Applications',
    description: 'Native iOS and Android apps',
    features: [
      'Offline-first architecture',
      'Push notifications for updates',
      'Camera integration for AR features',
      'Biometric authentication',
    ],
    technologies: ['React Native', 'Expo', 'AsyncStorage'],
    metrics: ['App size: <50MB', 'Offline cache: 100MB'],
  },
  'api-gateway': {
    title: 'API Gateway',
    description: 'Central entry point for all client requests',
    features: [
      'Rate limiting: 400 requests/second',
      'JWT authentication & authorization',
      'Request routing and load balancing',
      'API versioning support',
    ],
    technologies: ['Kong', 'NGINX', 'Redis for rate limiting'],
    metrics: ['Latency: <10ms', 'Uptime: 99.99%'],
  },
  'load-balancer': {
    title: 'Application Load Balancer',
    description: 'Distributes traffic across service instances',
    features: [
      'Health check monitoring',
      'Auto-scaling based on load',
      'SSL/TLS termination',
      'Sticky sessions support',
    ],
    technologies: ['AWS ALB', 'HAProxy'],
    metrics: ['Health check interval: 5s', 'Failover time: <30s'],
  },
  'query-service': {
    title: 'Query Service',
    description: 'Handles all search and query operations',
    features: [
      'Query parsing and optimization',
      'Cache lookup logic',
      'Response streaming',
      'Multi-language query support',
    ],
    technologies: ['Node.js', 'Express', 'TypeScript'],
    metrics: ['Cache hit rate: 70-80%', 'Processing time: <50ms'],
  },
  'vector-service': {
    title: 'Vector Embedding Service',
    description: 'Generates and manages vector embeddings',
    features: [
      'VoyageAI multimodal embeddings',
      '1024-dimensional vectors',
      'Batch processing support',
      'Embedding caching',
    ],
    technologies: ['Python', 'FastAPI', 'NumPy'],
    metrics: ['Embedding time: <200ms', 'Batch size: 100 items'],
  },
  'background-worker': {
    title: 'Background Processing Worker',
    description: 'Handles async tasks and updates',
    features: [
      'Priority queue processing',
      'Fresh search execution',
      'Cache warming',
      'Notification dispatch',
    ],
    technologies: ['Celery', 'Redis Queue', 'Python'],
    metrics: ['Queue size: <1000', 'Processing delay: <5s'],
  },
  'cache-layer': {
    title: 'MongoDB Cache Layer',
    description: 'Semantic similarity cache for queries',
    features: [
      'Vector similarity threshold: 0.65',
      'Dynamic TTL based on usage',
      'Document-aware invalidation',
      'Compression for storage efficiency',
    ],
    schema: {
      queryEmbedding: '[1024-dim vector]',
      queryText: 'string',
      response: 'object',
      metadata: 'object',
    },
    metrics: ['Hit rate: 70%+', 'Storage: 10GB'],
  },
  'mongodb-primary': {
    title: 'MongoDB Primary Database',
    description: 'Main document and vector storage',
    features: [
      'Atlas Vector Search indexes',
      'Change streams for real-time updates',
      'Auto-sharding for scale',
      'Point-in-time recovery',
    ],
    collections: ['projects', 'documents', 'vectors', 'chat_history'],
    metrics: ['Storage: 500GB', 'IOPS: 10,000'],
  },
  'mongodb-cache': {
    title: 'MongoDB Cache Database',
    description: 'Dedicated cache storage',
    features: [
      'TTL indexes for auto-expiration',
      'Compressed storage',
      'High-performance SSD',
      'Read-optimized configuration',
    ],
    collections: ['query_cache', 'embedding_cache'],
    metrics: ['Storage: 100GB', 'RAM: 32GB'],
  },
  'mongodb-analytics': {
    title: 'MongoDB Analytics',
    description: 'Time-series metrics and analytics',
    features: [
      'Query performance tracking',
      'Usage analytics',
      'Cost optimization data',
      'User behavior patterns',
    ],
    collections: ['metrics', 'user_analytics', 'performance_logs'],
    metrics: ['Retention: 90 days', 'Aggregation: 1min intervals'],
  },
  'claude-api': {
    title: 'Claude AI API',
    description: 'Image and document analysis',
    features: [
      'Multi-modal understanding',
      'Multi-language support',
      'PDF page analysis',
      'Technical diagram interpretation',
    ],
    technologies: ['Claude 3.5 Haiku', 'Anthropic SDK'],
    metrics: ['Response time: <3s', 'Token limit: 200k'],
  },
  'voyage-api': {
    title: 'VoyageAI API',
    description: 'Vector embedding generation',
    features: [
      'voyage-multimodal-3 model',
      '1024-dimensional embeddings',
      'Batch API support',
      'Cross-lingual embeddings',
    ],
    technologies: ['VoyageAI SDK'],
    metrics: ['Latency: <100ms', 'Batch size: 128'],
  },
  'message-queue': {
    title: 'Message Queue System',
    description: 'Event-driven communication',
    features: [
      'Priority queues',
      'Dead letter handling',
      'Message persistence',
      'Pub/sub patterns',
    ],
    technologies: ['Redis', 'RabbitMQ'],
    metrics: ['Throughput: 10k msg/s', 'Latency: <5ms'],
  },
};

// Hierarchical layout based on interaction depth from UI
export const initialNodes: Node[] = [
  // Level 0: Client Layer (Direct UI interaction)
  {
    id: 'client-web',
    type: 'custom',
    position: { x: 250, y: 0 },
    data: {
      label: 'Web Client',
      sublabel: 'React/Next.js',
      icon: '🌐',
      type: 'client',
      incoming: false,
      outgoing: true,
    },
  },
  {
    id: 'client-mobile',
    type: 'custom',
    position: { x: 550, y: 0 },
    data: {
      label: 'Mobile Client',
      sublabel: 'iOS/Android',
      icon: '📱',
      type: 'client',
      incoming: false,
      outgoing: true,
    },
  },
  
  // Level 1: Gateway (1 hop from UI)
  {
    id: 'api-gateway',
    type: 'custom',
    position: { x: 400, y: 120 },
    data: {
      label: 'API Gateway',
      sublabel: 'Kong/NGINX',
      icon: '🚪',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  
  // Level 2: Load Balancer (2 hops from UI)
  {
    id: 'load-balancer',
    type: 'custom',
    position: { x: 400, y: 240 },
    data: {
      label: 'Load Balancer',
      sublabel: 'ALB/HAProxy',
      icon: '⚖️',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  
  // Level 3: Primary Services (3 hops from UI)
  {
    id: 'query-service',
    type: 'custom',
    position: { x: 200, y: 360 },
    data: {
      label: 'Query Service',
      sublabel: 'Search Handler',
      icon: '🔍',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  {
    id: 'vector-service',
    type: 'custom',
    position: { x: 400, y: 360 },
    data: {
      label: 'Vector Service',
      sublabel: 'Embeddings',
      icon: '🧮',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  {
    id: 'background-worker',
    type: 'custom',
    position: { x: 600, y: 360 },
    data: {
      label: 'Background Worker',
      sublabel: 'Async Tasks',
      icon: '⚙️',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  
  // Level 4: Cache and Message Queue (4 hops from UI)
  {
    id: 'cache-layer',
    type: 'custom',
    position: { x: 200, y: 480 },
    data: {
      label: 'MongoDB Cache',
      sublabel: 'Query Cache',
      icon: '💾',
      type: 'cache',
      incoming: true,
      outgoing: true,
    },
  },
  {
    id: 'message-queue',
    type: 'custom',
    position: { x: 600, y: 480 },
    data: {
      label: 'Message Queue',
      sublabel: 'Redis/RabbitMQ',
      icon: '📬',
      type: 'service',
      incoming: true,
      outgoing: true,
    },
  },
  
  // Level 5: Primary Database and External APIs (5 hops from UI)
  {
    id: 'mongodb-primary',
    type: 'custom',
    position: { x: 200, y: 600 },
    data: {
      label: 'MongoDB Primary',
      sublabel: 'Atlas Cluster',
      icon: '🍃',
      type: 'database',
      incoming: true,
      outgoing: true,
    },
  },
  {
    id: 'claude-api',
    type: 'custom',
    position: { x: 50, y: 480 },
    data: {
      label: 'Claude API',
      sublabel: 'AI Analysis',
      icon: '🤖',
      type: 'service',
      incoming: true,
      outgoing: false,
    },
  },
  {
    id: 'voyage-api',
    type: 'custom',
    position: { x: 400, y: 480 },
    data: {
      label: 'VoyageAI API',
      sublabel: 'Embeddings',
      icon: '🚀',
      type: 'service',
      incoming: true,
      outgoing: false,
    },
  },
  
  // Level 6: Secondary Databases (6 hops from UI - deepest level)
  {
    id: 'mongodb-cache',
    type: 'custom',
    position: { x: 200, y: 720 },
    data: {
      label: 'MongoDB Cache DB',
      sublabel: 'Dedicated Cache',
      icon: '🗄️',
      type: 'database',
      incoming: true,
      outgoing: false,
    },
  },
  {
    id: 'mongodb-analytics',
    type: 'custom',
    position: { x: 600, y: 600 },
    data: {
      label: 'MongoDB Analytics',
      sublabel: 'Time Series',
      icon: '📊',
      type: 'database',
      incoming: true,
      outgoing: false,
    },
  },
];

export const initialEdges: Edge[] = [
  // Level 0 -> Level 1: Clients to API Gateway
  {
    id: 'e1',
    source: 'client-web',
    target: 'api-gateway',
    type: 'animated',
    animated: true,
    data: { label: 'HTTPS', flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e2',
    source: 'client-mobile',
    target: 'api-gateway',
    type: 'animated',
    animated: true,
    data: { label: 'HTTPS', flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 1 -> Level 2: API Gateway to Load Balancer
  {
    id: 'e3',
    source: 'api-gateway',
    target: 'load-balancer',
    type: 'animated',
    animated: true,
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 2 -> Level 3: Load Balancer to Services
  {
    id: 'e4',
    source: 'load-balancer',
    target: 'query-service',
    type: 'animated',
    animated: true,
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e5',
    source: 'load-balancer',
    target: 'vector-service',
    type: 'animated',
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e6',
    source: 'load-balancer',
    target: 'background-worker',
    type: 'animated',
    data: { flow: 'background' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 3 -> Level 4: Services to Cache/Queue
  {
    id: 'e7',
    source: 'query-service',
    target: 'cache-layer',
    type: 'animated',
    animated: true,
    data: { label: 'Cache lookup', flow: 'cache' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e8',
    source: 'query-service',
    target: 'message-queue',
    type: 'animated',
    data: { label: 'Queue job', flow: 'background' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e9',
    source: 'message-queue',
    target: 'background-worker',
    type: 'animated',
    data: { label: 'Process job', flow: 'background' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 3 -> Level 5: Services to External APIs
  {
    id: 'e10',
    source: 'query-service',
    target: 'claude-api',
    type: 'animated',
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e11',
    source: 'vector-service',
    target: 'voyage-api',
    type: 'animated',
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 3/4 -> Level 5: Services to Primary Database
  {
    id: 'e12',
    source: 'query-service',
    target: 'mongodb-primary',
    type: 'animated',
    data: { label: 'Vector search', flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e13',
    source: 'vector-service',
    target: 'mongodb-primary',
    type: 'animated',
    data: { flow: 'query' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e14',
    source: 'background-worker',
    target: 'mongodb-primary',
    type: 'animated',
    data: { flow: 'background' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e15',
    source: 'cache-layer',
    target: 'mongodb-primary',
    type: 'animated',
    data: { flow: 'cache' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 5 -> Level 6: Cache Layer to Cache DB
  {
    id: 'e16',
    source: 'cache-layer',
    target: 'mongodb-cache',
    type: 'animated',
    data: { flow: 'cache' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Level 3 -> Level 6: Background Worker to Analytics
  {
    id: 'e17',
    source: 'background-worker',
    target: 'mongodb-analytics',
    type: 'animated',
    data: { label: 'Log metrics', flow: 'background' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  
  // Reverse flow: Cache invalidation
  {
    id: 'e18',
    source: 'mongodb-primary',
    target: 'cache-layer',
    type: 'animated',
    style: { strokeDasharray: '5 5' },
    data: { label: 'Invalidate', flow: 'cache' },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];