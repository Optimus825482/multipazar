import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const geistSans = { variable: "--font-geist-sans", subsets: ["latin"] as const }
const geistMono = { variable: "--font-geist-mono", subsets: ["latin"] as const }

export const metadata: Metadata = {
  title: "Multi-Pazar Analiz Pro | Gumroad + Udemy + Capafy AI",
  description: "3 dijital pazaryerini karsilastirmali analiz edin. Gumroad dijital urunler, Udemy online kurslar, Capafy AI skill pazaryeri. Trendler, firsatlar ve capraz pazar stratejileri.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
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
