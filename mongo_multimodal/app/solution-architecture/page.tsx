'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './components/CustomNode';
import AnimatedEdge from './components/AnimatedEdge';
import { initialNodes, initialEdges, nodeDetails } from './architectureData';
import NodeDetailsPanel from './components/NodeDetailsPanel';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

const mongoColors = {
  primary: '#00684A',
  secondary: '#00ED64',
  dark: '#001E2B',
  light: '#E3FCF7',
  accent: '#B8E9D4',
};

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedFlow, setSelectedFlow] = useState<string>('query');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node.id);
  }, []);

  useEffect(() => {
    // Animate data flow based on selected flow type
    const animateFlow = () => {
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated: edge.data?.flow === selectedFlow,
        }))
      );
    };

    animateFlow();
    const interval = setInterval(animateFlow, 100);
    return () => clearInterval(interval);
  }, [selectedFlow, setEdges]);

  useEffect(() => {
    // Fit view on mount with proper spacing
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [fitView]);

  return (
    <div className="h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#E3FCF7"
        />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const colors = {
              client: mongoColors.secondary,
              service: mongoColors.primary,
              cache: mongoColors.accent,
              database: mongoColors.dark,
            };
            return colors[node.data?.type as keyof typeof colors] || mongoColors.primary;
          }}
          style={{
            backgroundColor: mongoColors.light,
            border: `1px solid ${mongoColors.accent}`,
          }}
        />
        <Panel position="top-left" className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Data Flow Visualization
            </h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="flow"
                  value="query"
                  checked={selectedFlow === 'query'}
                  onChange={(e) => setSelectedFlow(e.target.value)}
                  className="text-green-600"
                />
                <span className="text-sm">Query Flow</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="flow"
                  value="cache"
                  checked={selectedFlow === 'cache'}
                  onChange={(e) => setSelectedFlow(e.target.value)}
                  className="text-green-600"
                />
                <span className="text-sm">Cache Flow</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="flow"
                  value="background"
                  checked={selectedFlow === 'background'}
                  onChange={(e) => setSelectedFlow(e.target.value)}
                  className="text-green-600"
                />
                <span className="text-sm">Background Processing</span>
              </label>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
              Click on any component to view details
            </div>
          </div>
        </Panel>
        
        {/* Depth Indicators */}
        <div className="absolute left-4 top-24 bottom-4 w-12 pointer-events-none">
          <div className="h-full flex flex-col justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <div className="text-center">UI</div>
            <div className="text-center">1</div>
            <div className="text-center">2</div>
            <div className="text-center">3</div>
            <div className="text-center">4</div>
            <div className="text-center">5</div>
            <div className="text-center">6</div>
          </div>
        </div>
      </ReactFlow>
      
      {selectedNode && (
        <NodeDetailsPanel 
          nodeId={selectedNode} 
          nodeDetails={nodeDetails}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export default function SolutionArchitecturePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="py-8">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              Production RAG Solution Architecture
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Automotive Manual Assistant with MongoDB Vector Search & Caching
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-green-600">Scale</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  400 queries/sec • 50 concurrent users
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-green-600">Cache</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Semantic similarity: 0.65 threshold
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-green-600">AI Models</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  VoyageAI Multimodal • Claude 3.5
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg shadow">
                <h3 className="font-semibold text-green-600">Languages</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  9 languages • Cross-lingual search
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl" style={{ height: '80vh' }}>
            <ReactFlowProvider>
              <Flow />
            </ReactFlowProvider>
          </div>
        </div>
      </div>
    </div>
  );
}