import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth', 'kysely', 'pg'],
};

export default nextConfig;
