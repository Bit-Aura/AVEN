import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
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
