import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.svg"
              alt="MongoDB Logo"
              width={80}
              height={80}
              style={{ filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }}

              priority
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-emerald-400 to-blue-500 text-transparent bg-clip-text">
            AI Research Assistant
          </h1>
          <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-3xl mx-auto">
            An intelligent agent system powered by MongoDB Atlas, Claude AI, and multi-agent collaboration.
            Upload multimodal content, ask complex questions, and get AI-generated insights with planning and memory.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold mb-4 text-center">How It Works</h2>
        <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto text-center mb-12">
          Create projects, upload multimodal content, and interact with an intelligent AI agent that plans, researches, and synthesizes insights.
        </p>

        {/* Process Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Projects</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Organize your research into projects with PDFs, images, text files, and web content.
            </p>
          </div>

          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Processing</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Content analyzed by Claude AI, chunked intelligently, and vectorized for semantic search.
            </p>
          </div>

          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Agent Planning</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              AI agent creates execution plans, breaking down complex queries into actionable steps.
            </p>
          </div>

          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">4</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Insights</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Agent searches, analyzes, remembers context, and synthesizes comprehensive answers with citations.
            </p>
          </div>
        </div>

        {/* Agent Capabilities Section */}
        <div className="bg-gray-100/50 dark:bg-zinc-800/30 rounded-2xl p-8 border border-gray-300/50 dark:border-zinc-700/50">
          <h3 className="text-2xl font-bold mb-6 text-center">AI Agent Capabilities</h3>
          <div className="max-w-4xl mx-auto">
            {/* Sample Agent Queries */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-zinc-400 mb-4 text-center">The agent can handle complex research queries:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">&quot;Compare these diagrams and explain differences&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Multi-item analysis with context</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">&quot;Research best practices for this topic&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Web search + project knowledge</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">&quot;Find patterns across my uploaded data&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Memory-powered pattern recognition</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-pink-600 dark:text-pink-400 font-mono text-sm">&quot;Summarize findings and email to team&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Analysis + automated email delivery</p>
                </div>
              </div>
            </div>

            {/* Agent Tools */}
            <div className="bg-gray-200/50 dark:bg-zinc-900/50 rounded-lg p-6 border border-gray-400/30 dark:border-zinc-600/30">
              <h4 className="text-lg font-semibold mb-3 flex items-center">
                <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                Agent Tool Suite
              </h4>
              <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-2">
                <p>• <strong>planQuery:</strong> Creates execution plan before taking action (mandatory first step)</p>
                <p>• <strong>searchProjectData:</strong> Vector search across your project content with configurable results</p>
                <p>• <strong>analyzeImage:</strong> Deep analysis of images with project context awareness</p>
                <p>• <strong>rememberContext:</strong> Stores facts, preferences, patterns, and insights for future queries</p>
                <p>• <strong>recallMemory:</strong> Retrieves relevant memories from past conversations</p>
                <p>• <strong>searchWeb:</strong> Perplexity-powered web search with citations (optional)</p>
                <p>• <strong>sendEmail:</strong> Gmail integration for sharing insights (optional)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50/30 dark:bg-zinc-900/30">
        <h2 className="text-2xl font-bold mb-8 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Agent Planning */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Agent Planning</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Mandatory planning phase with visible execution plans. Agent shows you its strategy before taking action, breaking queries into steps.
            </p>
          </div>

          {/* Memory System */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Persistent Memory</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Agent remembers facts, preferences, patterns, and insights across sessions. Context-aware conversations that improve over time.
            </p>
          </div>

          {/* Multi-Agent Collaboration */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Agent System</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Coordinator, Search, Analysis, Memory, and Synthesis agents work together. Specialized expertise for complex tasks.
            </p>
          </div>

          {/* Multimodal Processing */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-pink-500/10 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multimodal Content</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Upload PDFs, images, text files, and web content. Smart chunking, Claude-powered analysis, and VoyageAI embeddings.
            </p>
          </div>

          {/* References & Citations */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Citations & Sources</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Every answer includes clickable citations. Track which sources were used, view tool execution details, and preview images.
            </p>
          </div>

          {/* External Tools */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">External Integration</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Optional web search via Perplexity AI and email delivery via Gmail. Toggle tools on/off per conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50/50 dark:bg-zinc-900/50">
        <h2 className="text-2xl font-bold mb-12 text-center">Powered by Advanced Technology</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">MongoDB Atlas</h3>
            <p className="text-gray-600 dark:text-zinc-400">Vector search with cosine similarity, stores conversations, memories, and analytics</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Claude AI</h3>
            <p className="text-gray-600 dark:text-zinc-400">Advanced reasoning, multimodal analysis, and agent orchestration with tool use</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">VoyageAI</h3>
            <p className="text-gray-600 dark:text-zinc-400">Multimodal embeddings (voyage-multimodal-3) with 1024-dimensional vectors</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Perplexity AI</h3>
            <p className="text-gray-600 dark:text-zinc-400">External web search with citations when agent needs additional context</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to start researching?</h2>
        <p className="text-xl text-gray-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          Create projects, upload your content, and let the AI agent help you discover insights with planning, memory, and multi-source analysis.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-lg text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Create Your First Project
            <ArrowRight className="ml-2 h-6 w-6" />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center px-8 py-4 border border-gray-400 dark:border-zinc-600 text-lg font-medium rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all transform hover:scale-105"
          >
            Try Global Search
            <Search className="ml-2 h-6 w-6" />
          </Link>
        </div>

        {/* Quick stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">7 Agent Tools</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">Planning, search, analysis, memory, web, email</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">5 Specialized Agents</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">Coordinator, search, analysis, memory, synthesis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">Multimodal</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">PDFs, images, text, web content</div>
          </div>
        </div>
      </div>
    </div>
  );

}
