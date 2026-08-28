"use client"

import { useEffect } from "react"

/**
 * Screen Wake Lock — menjaga layar HP tetap menyala selama halaman aktif.
 * Murni client-side; fallback diam jika API tidak tersedia.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return

    let sentinel: WakeLockSentinel | null = null
    let released = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen")
        // Bila browser melepas lock (mis. karna tab switching), ambil lagi
        sentinel.addEventListener("release", () => {
          sentinel = null
          if (!released) request()
        })
      } catch {
        // Permintaan ditolak — abaikan, app tetap jalan
      }
    }

    // Layar HP menyala lagi setelah tab kembali aktif
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) request()
    }

    request()
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      released = true
      document.removeEventListener("visibilitychange", onVisibility)
      sentinel?.release()
    }
  }, [])
}