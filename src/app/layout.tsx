import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { SerwistProvider } from "@serwist/turbopack/react"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "@/components/providers"
import { PwaInstallHint } from "@/components/pwa-install-hint"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Konter POS — Sistem Kasir Toko HP",
    template: "%s | Konter POS",
  },
  description:
    "Sistem Kasir (POS) untuk toko/kounter HP: kasir, stok, transaksi, laporan, dan cetak struk.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Konter POS",
  },
}

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <SerwistProvider swUrl="/serwist/sw.js">
          <Providers>
            {children}
            <PwaInstallHint />
            <Toaster position="top-center" richColors />
          </Providers>
        </SerwistProvider>
      </body>
    </html>
  )
}