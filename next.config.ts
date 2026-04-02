import type { NextConfig } from "next";

/**
 * Vercel: set BACKEND_PROXY_URL to your FastAPI base (e.g. http://3.x.x.x:8000) and
 * NEXT_PUBLIC_API_URL=/backend-api so the browser stays on HTTPS and avoids mixed content.
 */
const backendProxy = process.env.BACKEND_PROXY_URL?.trim();

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendProxy) return [];
    const target = backendProxy.replace(/\/$/, "");
    return [
      {
        source: "/backend-api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
