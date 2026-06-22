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
          // Content Security Policy
          //
          // ONEMLI CSP syntax notlari:
          // - blob: (tirnak YOK) -> blob URL'leri icin. 'blob' (tirnakli) GECERSIZ.
          // - 'unsafe-inline' / 'unsafe-eval' -> Next.js inline script + dev hot reload icin gerekli.
          // - script-src-elem explicit set edildi (CSP Level 3 fallback).
          // - 'self' + Cloudflare Insights subdomain'i izinli.
          //
          // NOT: Cloudflare uzerinden gelen Cloudflare Insights beacon'u
          // bazen 'unsafe-inline' gerektirebilir; burada acikca izin var.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // script-src: 'self', inline script (Next.js), eval (Next.js dev), blob: URL'ler, Cloudflare Insights
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com",
              // script-src-elem: yukaridaki fallback olarak (eski tarayicilar icin)
              "script-src-elem 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com",
              // style-src: Tailwind + inline style (component bazli)
              "style-src 'self' 'unsafe-inline'",
              "style-src-elem 'self' 'unsafe-inline'",
              // img: logo + data URL'ler + Cloudflare Analytics resimleri
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // connect: API scraper upstream'ler + Cloudflare Analytics
              "connect-src 'self' https://trends.google.com https://api.capafy.ai https://gumroad.com https://static.cloudflareinsights.com https://cloudflareinsights.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // worker: blob URL'lerden worker olusturulabilir
              "worker-src 'self' blob:",
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
