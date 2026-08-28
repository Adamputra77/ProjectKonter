import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Offline",
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-4xl">📡</p>
      <h1 className="text-xl font-bold">Anda Sedang Offline</h1>
      <p className="text-sm text-muted-foreground">
        Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.
      </p>
    </div>
  )
}