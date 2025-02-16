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
        'timers/promises': false
      };
    }
    return config;
  },
};

export default nextConfig;
