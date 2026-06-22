import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // TypeScript derleme hatalarini derleme sirasinda yakala.
  // Daha once ignoreBuildErrors:true ile tum TS hatalari gizleniyordu.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  // Guvenlik basliklari (CSP eklendi - XSS korumasi)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Content Security Policy - inline style/scripts Next.js icin gerekli;
          // unsafe-eval Next.js dev/prod hot-reload icin gerekli.
          // blob: Cloudflare Insights + bazi eklentiler icin gerekli.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // script-src-elem explicit set edildi (CSP Level 3 fallback sorununu onler)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'blob' https://static.cloudflareinsights.com",
              "script-src-elem 'self' 'unsafe-inline' 'blob' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'", // Tailwind + inline style
              "style-src-elem 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:", // logo + data URL'ler + Cloudflare Insights
              "font-src 'self' data:",
              "connect-src 'self' https://trends.google.com https://api.capafy.ai https://gumroad.com https://static.cloudflareinsights.com https://cloudflareinsights.com", // scraper + analytics
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
