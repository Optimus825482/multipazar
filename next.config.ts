import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript derleme hatalarini derleme sirasinda yakala.
  // Daha once ignoreBuildErrors:true ile tum TS hatalari gizleniyordu.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Guvenlik basliklari
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
