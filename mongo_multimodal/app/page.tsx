import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Image as ImageIcon, Search } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950 text-white">
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
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            A powerful demonstration of MongoDB Atlas Vector Search capabilities, combining
            multimodal data analysis with semantic search for research and documentation.
          </p>
        </div>
      </div>

      {/* Use Cases */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Research Papers */}
          <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Research Papers</h3>
            <p className="text-zinc-400 mb-4">
              Analyze research papers with figures and diagrams. Enable semantic search across visual and textual content.
            </p>
          </div>

          {/* Technical Documentation */}
          <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Technical Docs</h3>
            <p className="text-zinc-400 mb-4">
              Process technical diagrams and documentation. Search across architectural diagrams and descriptions.
            </p>
          </div>

          {/* Medical Analysis */}
          <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors">
            <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Medical Analysis</h3>
            <p className="text-zinc-400 mb-4">
              Store and analyze medical images with related reports. Generate insights by combining multiple sources.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-zinc-900/50">
        <h2 className="text-2xl font-bold mb-12 text-center">Powered by Advanced Technology</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">MongoDB Atlas</h3>
            <p className="text-zinc-400">Vector search capabilities with cosine similarity and 1024-dimensional vectors</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">VoyageAI</h3>
            <p className="text-zinc-400">State-of-the-art embeddings for both text and image content</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Claude</h3>
            <p className="text-zinc-400">Advanced analysis and insight generation from multimodal content</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-8">Ready to explore?</h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/projects"
            className="inline-flex items-center px-6 py-3 text-base font-medium rounded-md text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 transition-colors"
          >
            View Projects
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center px-6 py-3 border border-zinc-600 text-base font-medium rounded-md text-white hover:bg-zinc-800 transition-colors"
          >
            Try Global Search
            <Search className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );

}
