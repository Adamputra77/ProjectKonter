import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | Konter POS",
  },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")
  if (!profile.is_active) redirect("/login")

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        full_name: profile.full_name,
        role: profile.role,
      }}
    >
      {children}
    </AppShell>
  )
}