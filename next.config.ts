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
          // unsafe-eval sadece dev icin. Production'da ek sıkılastırma yapılabilir.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js dev/prod gereksinimi
              "style-src 'self' 'unsafe-inline'", // Tailwind + inline style
              "img-src 'self' data: https:", // logo + data URL'ler
              "font-src 'self' data:",
              "connect-src 'self' https://trends.google.com https://api.capafy.ai https://gumroad.com", // scraper upstream'ler
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
