import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'better-auth',
    'kysely',
    'kysely-neon',
    '@neondatabase/serverless',
    'pg',
  ],
};

export default nextConfig;
