"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { X, Download } from "lucide-react"

const STORAGE_KEY = "konter_pwa_hint_dismissed"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

/** External store: menangkap beforeinstallprompt dan mem-broadcast ke subscriber. */
function createInstallPromptStore() {
  let prompt: BeforeInstallPromptEvent | null = null
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      prompt = e as BeforeInstallPromptEvent
      emit()
    })
  }

  return {
    get: () => prompt,
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}

/**
 * Banner sekali-tampil: ajak pengguna menambahkan aplikasi ke layar utama
 * (Android: beforeinstallprompt; iOS: instruksi Add to Home Screen).
 */
export function PwaInstallHint() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true
    try {
      return localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      return true
    }
  })
  const store = useMemo(() => createInstallPromptStore(), [])
  const installPrompt = useSyncExternalStore(store.subscribe, store.get, () => null)
  const isIOS =
    typeof window !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      // ignore
    }
  }

  const promptInstall = () => {
    if (installPrompt) {
      installPrompt.prompt()
      installPrompt.userChoice.finally(dismiss)
    } else {
      dismiss()
    }
  }

  if (dismissed) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-xl border bg-card p-3 shadow-lg lg:bottom-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Pasang Aplikasi Konter POS</p>
        <p className="text-xs text-muted-foreground">
          {isIOS
            ? "Di Safari: tombol Bagikan → 'Tambahkan ke Layar Utama'."
            : "Jalankan seperti aplikasi asli — cepat dibuka, tanpa login berulang."}
        </p>
      </div>
      {installPrompt ? (
        <button
          onClick={promptInstall}
          className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
        >
          Pasang
        </button>
      ) : (
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold"
        >
          {isIOS ? "Oke" : "Nanti"}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}