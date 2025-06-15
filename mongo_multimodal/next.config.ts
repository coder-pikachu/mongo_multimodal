import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include these Node.js specific modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        'fs/promises': false,
        net: false,
        tls: false,
        dns: false,
        'util/types': false,
        timers: false,
        'timers/promises': false,
        'node:child_process': false,
        'node:fs': false,
        'node:fs/promises': false,
        'node:path': false
      };
      
      // Add alias for pdfjs-dist to avoid issues with canvas
      config.resolve.alias = {
        ...config.resolve.alias,
        'canvas': false
      };
    }
    return config;
  },
};

export default nextConfig;
