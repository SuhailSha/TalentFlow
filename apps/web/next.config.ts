import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Make workspace packages transpile-able through Next.js bundler
  transpilePackages: ['@repo/types', '@repo/validators'],

  // Tell Turbopack where the monorepo root is so it doesn't pick up a wrong lockfile
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
