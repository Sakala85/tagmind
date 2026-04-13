"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) router.push("/dashboard")
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="w-full max-w-sm space-y-8">
          <Logo size={40} dark={false} />

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bon retour 👋
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connectez-vous avec Google pour accéder à vos containers GTM, lancer des audits et piloter l'agent IA.
            </p>
          </div>

          {/* Google Sign-in */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-all shadow-sm"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuer avec Google
          </button>

          <p className="text-center text-xs text-muted-foreground">
            En continuant, vous autorisez l'accès à vos données Google Tag Manager.
          </p>

          <div className="text-center">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>

      {/* Right panel — indigo accent */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
        {/* dot grid overlay */}
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-10" />

        <div className="relative max-w-md space-y-8 p-12 text-white">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
              Pourquoi TagMind ?
            </p>
            <h3 className="text-2xl font-bold leading-snug">
              Gérez vos tags à la vitesse de la pensée
            </h3>
          </div>

          <div className="space-y-5">
            {[
              { emoji: "🤖", title: "Agent IA natif GTM",  desc: "Créez, modifiez et publiez des tags en langage naturel" },
              { emoji: "🔍", title: "Audit instantané",     desc: "Détectez tags orphelins, doublons et problèmes de consentement" },
              { emoji: "📊", title: "Dashboard complet",    desc: "Tous vos containers, workspaces et variables en un coup d'œil" },
              { emoji: "⚡", title: "Actions en lot",       desc: "Setup e-commerce GA4 complet en une seule instruction" },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-base">
                  {item.emoji}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-indigo-200 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
