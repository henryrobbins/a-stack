import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // In production Vercel Services routes /api/py/* to the FastAPI service on
  // the same origin. In development, proxy it to the local API server so
  // browser code is identical in both.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/api/py/:path*',
        destination: `${process.env.API_DEV_URL ?? 'http://localhost:8000'}/api/py/:path*`,
      },
    ];
  },
};

export default nextConfig;
