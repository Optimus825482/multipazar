import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = { variable: "--font-geist-sans", subsets: ["latin"] as const }
const geistMono = { variable: "--font-geist-mono", subsets: ["latin"] as const }

export const metadata: Metadata = {
  title: "Gumroad Pazar Analiz Pro | Dijital Urun Market Analizi",
  description: "Gumroad dijital urun pazarini derinlemesine analiz edin. En cok aranan, talep goren ve satilan kategorileri kesfedin. Yuksek talep/dusuk arz firsatlari bulun.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
