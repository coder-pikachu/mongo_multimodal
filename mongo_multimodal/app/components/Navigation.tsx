'use client';

import Link from 'next/link';
import { Home, Search, LogOut, FolderOpen, Moon, Sun, Network } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export function Navigation() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Image
                src="/logo.svg"
                alt="MongoDB Logo"
                width={20}
                height={20}
                className="text-green-500"
                style={{ filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }}
              />&nbsp;&nbsp;&nbsp;
              <Link href="/" className="text-xl font-semibold text-zinc-900 dark:text-white">
                Vector Search <sub><p className="text-xs">powered by MongoDB Atlas</p></sub>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
              <Link
                href="/projects"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/projects')
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Projects
              </Link>
              <Link
                href="/search"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Link>
              <Link
                href="/solution-architecture"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/solution-architecture')
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Network className="w-4 h-4 mr-2" />
                Architecture
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-zinc-900"
              suppressHydrationWarning
            >
              {mounted && (theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />)}
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
