'use client';

import Link from 'next/link';
import { Home, Search, LogOut, FolderOpen, Moon, Sun, Network } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export function Navigation() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  useEffect(() => {
    setMounted(true);

    // Add scroll listener for elegant backdrop blur effect
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    if (!mounted) return;
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-md border-b border-neutral-200/50 dark:border-neutral-800/50'
          : 'bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left section - Logo and primary navigation */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center group">
              <div className="relative mr-3 transition-transform duration-300 group-hover:scale-110">
                <Image
                  src="/logo.svg"
                  alt="MongoDB Logo"
                  width={24}
                  height={24}
                  className="transition-opacity duration-300"
                  style={{ filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%)' }}
                />
              </div>
              <Link
                href="/"
                className="flex flex-col group-hover:opacity-80 transition-opacity"
                aria-label="Home - AI Agent Space"
              >
                <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
                  AI Agent Space
                </span>
                <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 -mt-1">
                  powered by MongoDB Atlas
                </span>
              </Link>
            </div>

            {/* Primary navigation links */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              <Link
                href="/"
                className={`relative inline-flex items-center px-3 pt-1 text-sm font-medium transition-all duration-200 group ${
                  isActive('/')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
                aria-current={isActive('/') ? 'page' : undefined}
              >
                <Home className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                Home
                {isActive('/') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>

              <Link
                href="/projects"
                className={`relative inline-flex items-center px-3 pt-1 text-sm font-medium transition-all duration-200 group ${
                  isActive('/projects')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
                aria-current={isActive('/projects') ? 'page' : undefined}
              >
                <FolderOpen className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                Projects
                {isActive('/projects') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>

              <Link
                href="/search"
                className={`relative inline-flex items-center px-3 pt-1 text-sm font-medium transition-all duration-200 group ${
                  isActive('/search')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
                aria-current={isActive('/search') ? 'page' : undefined}
              >
                <Search className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                Search
                {isActive('/search') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>

              <Link
                href="/solution-architecture"
                className={`relative inline-flex items-center px-3 pt-1 text-sm font-medium transition-all duration-200 group ${
                  isActive('/solution-architecture')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50'
                }`}
                aria-current={isActive('/solution-architecture') ? 'page' : undefined}
              >
                <Network className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" />
                Architecture
                {isActive('/solution-architecture') && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
                )}
              </Link>
            </div>
          </div>

          {/* Right section - Theme toggle and actions */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-3">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              suppressHydrationWarning
            >
              {mounted && (
                <div className="relative w-5 h-5">
                  <Sun className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'}`} />
                  <Moon className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${theme === 'light' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
                </div>
              )}
            </button>

            {/* Sign out button */}
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-sm font-medium rounded-lg text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
              aria-label="Sign out"
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
