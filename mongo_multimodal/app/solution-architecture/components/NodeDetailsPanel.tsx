import React from 'react';
import { X, Database, Cpu, Cloud, Shield, Zap, Globe, Code, Server } from 'lucide-react';

interface NodeDetail {
  title: string;
  description: string;
  features?: string[];
  technologies?: string[];
  collections?: string[];
  schema?: Record<string, string>;
  metrics?: string[];
}

interface NodeDetailsPanelProps {
  nodeId: string;
  nodeDetails: Record<string, NodeDetail>;
  onClose: () => void;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ nodeId, nodeDetails, onClose }) => {
  const details = nodeDetails[nodeId];
  
  if (!details) return null;

  const getIcon = () => {
    const icons: { [key: string]: React.ReactNode } = {
      'mongodb-primary': <Database className="w-6 h-6" />,
      'mongodb-cache': <Database className="w-6 h-6" />,
      'mongodb-analytics': <Database className="w-6 h-6" />,
      'query-service': <Server className="w-6 h-6" />,
      'vector-service': <Cpu className="w-6 h-6" />,
      'background-worker': <Cpu className="w-6 h-6" />,
      'cache-layer': <Shield className="w-6 h-6" />,
      'claude-api': <Cloud className="w-6 h-6" />,
      'voyage-api': <Cloud className="w-6 h-6" />,
      'message-queue': <Zap className="w-6 h-6" />,
      'api-gateway': <Shield className="w-6 h-6" />,
      'load-balancer': <Server className="w-6 h-6" />,
      'client-web': <Globe className="w-6 h-6" />,
      'client-mobile': <Globe className="w-6 h-6" />,
    };
    return icons[nodeId] || <Code className="w-6 h-6" />;
  };

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-zinc-800 p-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-green-600">{getIcon()}</div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {details.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {details.description}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {details.features && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Features
            </h3>
            <ul className="space-y-2">
              {details.features.map((feature: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {details.technologies && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {details.technologies.map((tech: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {details.collections && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Collections
            </h3>
            <div className="space-y-1">
              {details.collections.map((collection: string, index: number) => (
                <div
                  key={index}
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded text-sm font-mono text-zinc-700 dark:text-zinc-300"
                >
                  {collection}
                </div>
              ))}
            </div>
          </div>
        )}

        {details.schema && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Schema
            </h3>
            <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg">
              <pre className="text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                {JSON.stringify(details.schema, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {details.metrics && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {details.metrics.map((metric: string, index: number) => (
                <div
                  key={index}
                  className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{metric}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {nodeId === 'cache-layer' && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Cache Strategy Details
            </h3>
            <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-lg space-y-2 text-sm">
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>Similarity Matching:</strong> Uses cosine similarity with a threshold of 0.65
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>Invalidation:</strong> Document updates trigger cache invalidation for related queries
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>TTL Strategy:</strong> Dynamic TTL based on query frequency (1hr - 7 days)
              </p>
            </div>
          </div>
        )}

        {nodeId === 'query-service' && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
              Query Processing Flow
            </h3>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start space-x-2">
                <span className="font-semibold text-green-600">1.</span>
                <span className="text-zinc-600 dark:text-zinc-400">Check cache for similar queries</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-semibold text-green-600">2.</span>
                <span className="text-zinc-600 dark:text-zinc-400">Return cached result if similarity ≥ 0.65</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-semibold text-green-600">3.</span>
                <span className="text-zinc-600 dark:text-zinc-400">Queue background job for fresh search</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-semibold text-green-600">4.</span>
                <span className="text-zinc-600 dark:text-zinc-400">Update UI when fresh results available</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeDetailsPanel;