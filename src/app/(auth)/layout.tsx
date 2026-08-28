import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Masuk",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      {children}
    </div>
  )
}