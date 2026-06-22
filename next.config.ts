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
          // NOT: Sıkı CSP, Next.js ile sorun çıkarabilir. Burada pragmatik
          // bir orta yol tutuyoruz:
          // - script-src: Next.js inline + eval + blob + Cloudflare
          // - connect-src: Kendi API'lerimiz + Google Analytics (Cloudflare arkasinda) + https:* (genis, proxy/fetch API'lari icin)
          // - Tum HTTPS subdomain'lere izin veriyoruz (sadece 'self' yetmiyor;
          //   Cloudflare Analytics, Google Fonts, vb. external kaynaklar).
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // script-src: Next.js inline + eval + blob URL + Cloudflare beacon
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com https://*.cloudflareinsights.com",
              "script-src-elem 'self' 'unsafe-inline' blob: https://static.cloudflareinsights.com",
              // style-src: Tailwind + inline style (component bazli)
              "style-src 'self' 'unsafe-inline'",
              "style-src-elem 'self' 'unsafe-inline'",
              // img: logo + data URL'ler + herhangi bir HTTPS kaynagi (analytics vs.)
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              // connect: API scraper upstream + Google Analytics (Cloudflare arkasinda) + tum HTTPS
              // NOT: 'self' zaten mevcut API route'larimizi kapsar (same-origin).
              // Google Analytics Cloudflare proxy uzerinden yuklendiginden www subdomain ekledik.
              "connect-src 'self' https://trends.google.com https://api.capafy.ai https://gumroad.com https://static.cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com https://www.googletagmanager.com https://*.googleapis.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // worker: blob URL'lerden worker olusturulabilir
              "worker-src 'self' blob:",
              // media: video/audio (gelecekte gerekli olabilir)
              "media-src 'self' blob: https:",
              // object/embed: Flash ve eski teknolojiler - kapat
              "object-src 'none'",
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
