import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/oauth-callback",
        destination: "http://localhost:3001/oauth-callback",
        permanent: false,
      },
      {
        source: "/frontend/:path*",
        destination: "http://localhost:3001/frontend/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
