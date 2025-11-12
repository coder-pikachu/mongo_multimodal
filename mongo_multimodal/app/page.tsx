import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 via-neutral-100 to-neutral-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 text-neutral-900 dark:text-neutral-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-8 animate-bounce-subtle">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full animate-pulse-subtle" />
              <Image
                src="/logo.svg"
                alt="MongoDB Logo"
                width={96}
                height={96}
                style={{ filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }}
                className="relative"
                priority
              />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-purple-500 text-transparent bg-clip-text animate-slide-in-up">
            AI Agent Space
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed animate-slide-in-up">
            An intelligent agent system powered by <span className="font-semibold text-primary-600 dark:text-primary-400">MongoDB Atlas</span>, <span className="font-semibold text-accent-purple-600 dark:text-accent-purple-400">Claude AI</span>, and multi-agent collaboration.
            Upload multimodal content, ask complex questions, and get AI-generated insights with planning and memory.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center text-neutral-900 dark:text-neutral-50">How It Works</h2>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-center mb-16 leading-relaxed">
          Create projects, upload multimodal content, and interact with an intelligent AI agent that plans, researches, and synthesizes insights.
        </p>

        {/* Process Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <div className="text-center group animate-slide-in-up">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl font-black text-white">1</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">Create Projects</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Organize your research into projects with PDFs, images, text files, and web content.
            </p>
          </div>

          <div className="text-center group animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary-500 to-accent-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-secondary-500 to-accent-purple-500 flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl font-black text-white">2</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">AI Processing</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Content analyzed by Claude AI, chunked intelligently, and vectorized for semantic search.
            </p>
          </div>

          <div className="text-center group animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-purple-500 to-error-500 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-accent-purple-500 to-error-500 flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl font-black text-white">3</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">Agent Planning</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              AI agent creates execution plans, breaking down complex queries into actionable steps.
            </p>
          </div>

          <div className="text-center group animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-error-500 to-accent-orange-500 rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-error-500 to-accent-orange-500 flex items-center justify-center mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="text-3xl font-black text-white">4</span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">Get Insights</h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Agent searches, analyzes, remembers context, and synthesizes comprehensive answers with citations.
            </p>
          </div>
        </div>

        {/* Agent Capabilities Section */}
        <div className="bg-gradient-to-br from-neutral-100/80 to-neutral-200/50 dark:from-neutral-800/50 dark:to-neutral-900/30 rounded-3xl p-10 border border-neutral-300/50 dark:border-neutral-700/50 backdrop-blur-sm shadow-xl">
          <h3 className="text-3xl font-bold mb-8 text-center text-neutral-900 dark:text-neutral-50">AI Agent Capabilities</h3>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-neutral-900 dark:text-neutral-50">Ready to start researching?</h2>
        <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Create projects, upload your content, and let the AI agent help you discover insights with planning, memory, and multi-source analysis.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link
            href="/projects"
            className="group inline-flex items-center justify-center px-10 py-5 text-lg font-semibold rounded-2xl text-neutral-900 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-glow-lg"
          >
            Create Your First Project
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/search"
            className="group inline-flex items-center justify-center px-10 py-5 border-2 border-neutral-300 dark:border-neutral-700 text-lg font-semibold rounded-2xl text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Try Global Search
            <Search className="ml-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
          </Link>
        </div>

        {/* Quick stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border border-primary-200/50 dark:border-primary-800/50 hover:shadow-lg transition-shadow">
            <div className="text-3xl font-black text-primary-600 dark:text-primary-400 mb-2">7 Agent Tools</div>
            <div className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">Planning, search, analysis, memory, web, email</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-secondary-50 to-secondary-100/50 dark:from-secondary-900/20 dark:to-secondary-800/10 border border-secondary-200/50 dark:border-secondary-800/50 hover:shadow-lg transition-shadow">
            <div className="text-3xl font-black text-secondary-600 dark:text-secondary-400 mb-2">5 Specialized Agents</div>
            <div className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">Coordinator, search, analysis, memory, synthesis</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-accent-purple-50 to-accent-purple-100/50 dark:from-accent-purple-900/20 dark:to-accent-purple-800/10 border border-accent-purple-200/50 dark:border-accent-purple-800/50 hover:shadow-lg transition-shadow">
            <div className="text-3xl font-black text-accent-purple-600 dark:text-accent-purple-400 mb-2">Multimodal</div>
            <div className="text-neutral-600 dark:text-neutral-400 text-sm font-medium">PDFs, images, text, web content</div>
          </div>
        </div>
      </div>
    </div>
  );

}
