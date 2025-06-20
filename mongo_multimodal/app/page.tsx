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
            Multimodal Vector Search
          </h1>
          <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-3xl mx-auto">
            A powerful demonstration of MongoDB Atlas Vector Search capabilities, combining
            multimodal data analysis with semantic search for research and documentation.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold mb-4 text-center">How It Works</h2>
        <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto text-center mb-12">
          Upload PDFs and images, then ask questions in natural language to find relevant content across all your documents.
        </p>

        {/* Process Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Content</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Upload PDFs (up to 20MB) and images. PDFs are automatically converted to searchable pages.
            </p>
          </div>

          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Content is analyzed by Claude AI and converted to vector embeddings for semantic search.
            </p>
          </div>

          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Ask Questions</h3>
            <p className="text-gray-600 dark:text-zinc-400">
              Query in natural language to find relevant images and get AI-generated insights.
            </p>
          </div>
        </div>

        {/* Live Demo Section */}
        <div className="bg-gray-100/50 dark:bg-zinc-800/30 rounded-2xl p-8 border border-gray-300/50 dark:border-zinc-700/50">
          <h3 className="text-2xl font-bold mb-6 text-center">Try Global Search</h3>
          <div className="max-w-4xl mx-auto">
            {/* Sample Query Examples */}
            <div className="mb-6">
              <p className="text-gray-600 dark:text-zinc-400 mb-4 text-center">Example queries you can try:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">&quot;How to calculate pressure?&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Find technical calculations and formulas</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-blue-600 dark:text-blue-400 font-mono text-sm">&quot;Show me technical diagrams&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Discover relevant technical drawings</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-purple-600 dark:text-purple-400 font-mono text-sm">&quot;Safety procedures&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Search for safety-related content</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-gray-300/30 dark:border-zinc-700/30">
                  <span className="text-pink-600 dark:text-pink-400 font-mono text-sm">&quot;Process specifications&quot;</span>
                  <p className="text-gray-500 dark:text-zinc-500 text-xs mt-1">Find detailed process documentation</p>
                </div>
              </div>
            </div>

            {/* API Info */}
            <div className="bg-gray-200/50 dark:bg-zinc-900/50 rounded-lg p-6 border border-gray-400/30 dark:border-zinc-600/30">
              <h4 className="text-lg font-semibold mb-3 flex items-center">
                <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                Powered by Global Search API
              </h4>
              <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-2">
                <p><span className="text-emerald-600 dark:text-emerald-400 font-mono">POST /api/search</span> - Search across all projects and documents</p>
                <p>• <strong>Vector Similarity:</strong> MongoDB Atlas Vector Search with 1024-dimensional embeddings</p>
                <p>• <strong>Multimodal:</strong> Supports both text queries and image uploads</p>
                <p>• <strong>AI Analysis:</strong> Claude AI generates comprehensive responses with relevant images</p>
                <p>• <strong>Smart Filtering:</strong> Returns top 10 results with 60%+ similarity scores</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50/30 dark:bg-zinc-900/30">
        <h2 className="text-2xl font-bold mb-8 text-center">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Research Papers */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Research Papers</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Analyze research papers with figures and diagrams. Enable semantic search across visual and textual content.
            </p>
          </div>

          {/* Technical Documentation */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Technical Docs</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Process technical diagrams and documentation. Search across architectural diagrams and descriptions.
            </p>
          </div>

          {/* Medical Analysis */}
          <div className="bg-gray-100/50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-300/50 dark:border-zinc-700/50 hover:border-gray-400/50 dark:hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Medical Analysis</h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-4">
              Store and analyze medical images with related reports. Generate insights by combining multiple sources.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gray-50/50 dark:bg-zinc-900/50">
        <h2 className="text-2xl font-bold mb-12 text-center">Powered by Advanced Technology</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">MongoDB Atlas</h3>
            <p className="text-gray-600 dark:text-zinc-400">Vector search capabilities with cosine similarity and 1024-dimensional vectors</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">VoyageAI</h3>
            <p className="text-gray-600 dark:text-zinc-400">State-of-the-art embeddings for both text and image content</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Claude</h3>
            <p className="text-gray-600 dark:text-zinc-400">Advanced analysis and insight generation from multimodal content</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to explore?</h2>
        <p className="text-xl text-gray-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          Start by creating projects and uploading your documents, or dive right into global search to see the system in action.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/search"
            className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-lg text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Try Global Search
            <Search className="ml-2 h-6 w-6" />
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center px-8 py-4 border border-gray-400 dark:border-zinc-600 text-lg font-medium rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-all transform hover:scale-105"
          >
            Manage Projects
            <ArrowRight className="ml-2 h-6 w-6" />
          </Link>
        </div>

        {/* Quick stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">PDF Support</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">Up to 20MB, auto-converted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">Vector Search</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">1024-dimensional embeddings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">AI Analysis</div>
            <div className="text-gray-600 dark:text-zinc-400 text-sm">Claude + VoyageAI powered</div>
          </div>
        </div>
      </div>
    </div>
  );

}
