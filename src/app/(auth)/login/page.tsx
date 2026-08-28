"use client"

import { useActionState, useEffect } from "react"
import { Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { signIn, type AuthState } from "@/lib/actions/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const initialState: AuthState = { error: null }

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = searchParams.get("next") || "/dashboard"

  const [state, formAction, pending] = useActionState(signIn, initialState)

  useEffect(() => {
    if (state.error === null && state.success === undefined && !pending) {
      // sukses: action melakukan redirect sendiri
    }
  }, [state, pending, router, next])

  return (
    <Card className="w-full max-w-sm shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Masuk ke Konter POS</CardTitle>
        <CardDescription>Sistem kasir toko/kounter HP</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@konter.test"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {state.error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Masuk
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo: admin@konter.test / admin123 · kasir@konter.test / kasir123
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}