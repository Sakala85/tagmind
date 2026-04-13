"use client"

import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

/* ── Animated chat demo data ──────────────────────────────────────── */
const CHAT_STEPS = [
  { role: "user",  text: "Crée un tag GA4 purchase avec le bon trigger" },
  { role: "agent", text: "Bien sûr ! Je crée le trigger CE - purchase et le tag GA4 Purchase…", delay: 900 },
  { role: "status", text: "✓ Trigger « CE - purchase » créé", delay: 1800 },
  { role: "status", text: "✓ Tag « GA4 - Purchase » créé et lié", delay: 2600 },
  { role: "agent", text: "C'est fait ! Tout est lié. Voulez-vous que je publie ?", delay: 3400 },
  { role: "user",  text: "Oui, publie", delay: 4200 },
  { role: "status", text: "🚀 Version publiée avec succès", delay: 5000 },
]

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.607L4.2 15m15.6 0-1.57 2.357A2.25 2.25 0 0 1 16.2 18.75H7.8a2.25 2.25 0 0 1-1.83-.993L4.2 15" />
      </svg>
    ),
    title: "AI Agent natif GTM",
    desc: "Décrivez ce que vous voulez faire en langage naturel. L'agent crée, modifie, supprime tags, triggers et variables pour vous — sans jamais toucher l'interface GTM.",
    badge: "Nouveau",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5H6m12 0v4.5m-12-4.5v4.5M9 21h6" />
      </svg>
    ),
    title: "Visualisation complète",
    desc: "Dashboard clair de tous vos containers, workspaces, tags, triggers et variables. Fini les onglets perdus dans Google Tag Manager.",
    badge: null,
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Audit en un clic",
    desc: "Identifiez instantanément les tags orphelins, les doublons, les problèmes de consentement et les risques de sécurité.",
    badge: null,
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Actions en lot",
    desc: "Créez un setup e-commerce GA4 complet (purchase, add_to_cart, begin_checkout…) en une seule instruction. L'agent s'occupe de tout l'ordre d'exécution.",
    badge: null,
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    title: "Templates server-side",
    desc: "Importez et installez vos templates de containers server-side directement depuis le dashboard. Zéro friction.",
    badge: null,
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    title: "Sync automatique",
    desc: "Vos données GTM sont synchronisées et mises en cache. L'agent a toujours une vue fraîche de votre container pour des recommandations précises.",
    badge: null,
  },
]

/* ── Animated chat window component ──────────────────────────────── */
function ChatDemo() {
  const [visibleCount, setVisibleCount] = useState(1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const scheduleNext = (idx: number) => {
      if (idx >= CHAT_STEPS.length) {
        timerRef.current = setTimeout(() => setVisibleCount(1), 3500)
        return
      }
      const step = CHAT_STEPS[idx]
      const delay = step.delay !== undefined ? step.delay - (CHAT_STEPS[idx - 1]?.delay ?? 0) : 0
      timerRef.current = setTimeout(() => {
        setVisibleCount(idx + 1)
        scheduleNext(idx + 1)
      }, delay)
    }
    setVisibleCount(1)
    scheduleNext(1)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className="glass rounded-2xl overflow-hidden w-full max-w-md shadow-2xl shadow-indigo-950/50">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="h-3 w-3 rounded-full bg-red-400/80" />
        <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
        <div className="h-3 w-3 rounded-full bg-green-400/80" />
        <span className="ml-3 text-xs text-white/40 font-mono">TagMind Agent</span>
      </div>
      {/* Messages */}
      <div className="p-4 space-y-3 min-h-[260px]">
        {CHAT_STEPS.slice(0, visibleCount).map((step, i) => {
          if (step.role === "user") {
            return (
              <div key={i} className="flex justify-end animate-chat">
                <div className="bg-indigo-500 text-white text-sm px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%] shadow-lg">
                  {step.text}
                </div>
              </div>
            )
          }
          if (step.role === "agent") {
            return (
              <div key={i} className="flex items-start gap-2 animate-chat">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-lg">
                  AI
                </div>
                <div className="bg-white/10 text-white/90 text-sm px-4 py-2 rounded-2xl rounded-bl-sm max-w-[80%]">
                  {step.text}
                </div>
              </div>
            )
          }
          return (
            <div key={i} className="flex justify-center animate-chat">
              <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {step.text}
              </div>
            </div>
          )
        })}
        {/* typing indicator when agent is about to respond */}
        {visibleCount < CHAT_STEPS.length && CHAT_STEPS[visibleCount - 1]?.role === "user" && (
          <div className="flex items-start gap-2 animate-chat">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">AI</div>
            <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
      {/* Input bar */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
          <span className="flex-1 text-sm text-white/30 font-mono">Tapez une instruction GTM…</span>
          <span className="animate-cursor text-indigo-400 text-lg leading-none">|</span>
        </div>
      </div>
    </div>
  )
}

/* ── Workflow step data ───────────────────────────────────────────── */
const WORKFLOW_STEPS = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
      </svg>
    ),
    color: "from-blue-500 to-indigo-600",
    glow: "shadow-blue-500/40",
    label: "Connectez-vous",
    detail: "1 clic avec Google",
    desc: "OAuth sécurisé — TagMind accède à vos containers GTM sans jamais stocker votre mot de passe.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
    color: "from-indigo-500 to-violet-600",
    glow: "shadow-indigo-500/40",
    label: "Synchronisez",
    detail: "Import auto en 3s",
    desc: "Tous vos containers, workspaces, tags, triggers et variables sont chargés et indexés par l'agent.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
    ),
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/40",
    label: "Parlez à l'agent",
    detail: "Langage naturel",
    desc: "Décrivez ce que vous voulez : l'agent comprend vos intentions et prépare le plan d'action optimal.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: "from-purple-500 to-fuchsia-600",
    glow: "shadow-purple-500/40",
    label: "L'agent exécute",
    detail: "Tags, triggers, publish",
    desc: "Création, mise à jour, suppression, publication — tout se fait en quelques secondes, dans le bon ordre.",
  },
]

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    if (status === "loading") return
    if (session) router.replace("/dashboard")
  }, [session, status, router])

  useEffect(() => {
    const t = setInterval(() => setActiveStep((s) => (s + 1) % WORKFLOW_STEPS.length), 2800)
    return () => clearInterval(t)
  }, [])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }
  if (session) return null

  return (
    <div className="min-h-screen bg-[#09090f] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#09090f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo size={36} />
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Se connecter
          </Button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Scrolling dot grid */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
          <div className="dot-grid animate-grid-scroll w-full" style={{ height: "200%" }} />
        </div>

        {/* Radial glow spots */}
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-purple-600/20 blur-[80px] animate-float-slow" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-fuchsia-600/15 blur-[60px] animate-float-slow delay-2000" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
                </span>
                Agent IA · Disponible maintenant
              </div>

              <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
                GTM piloté par<br />
                <span className="text-shimmer">l'intelligence artificielle</span>
              </h1>

              <p className="animate-fade-up delay-200 text-lg text-white/55 leading-relaxed max-w-lg">
                TagMind comprend vos intentions et parle directement à Google Tag Manager. Créez, auditez et publiez des tags sans jamais ouvrir l'interface GTM.
              </p>

              <div className="animate-fade-up delay-300 flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  className="h-13 px-7 text-base gap-3 bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-900/50 hover:shadow-indigo-800/60 transition-all border-0"
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
                  </svg>
                  Démarrer gratuitement
                </Button>
                <span className="text-sm text-white/35">Aucune carte · OAuth Google</span>
              </div>

              {/* Mini stats */}
              <div className="animate-fade-up delay-400 flex gap-8 pt-2">
                {[
                  { val: "10x", lbl: "plus rapide" },
                  { val: "0", lbl: "ligne de code" },
                  { val: "∞", lbl: "containers" },
                ].map((s) => (
                  <div key={s.lbl}>
                    <p className="text-2xl font-black text-white">{s.val}</p>
                    <p className="text-xs text-white/40 mt-0.5">{s.lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — animated chat demo */}
            <div className="animate-fade-up delay-300 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 blur-2xl" />
                <ChatDemo />
                {/* Floating tag chips */}
                <div className="absolute -left-10 top-8 glass rounded-xl px-3 py-2 text-xs font-mono text-green-300 animate-float shadow-lg shadow-black/30">
                  ✓ Tag créé
                </div>
                <div className="absolute -right-8 bottom-16 glass rounded-xl px-3 py-2 text-xs font-mono text-purple-300 animate-float delay-500 shadow-lg shadow-black/30">
                  🚀 Publié
                </div>
                <div className="absolute -left-6 bottom-8 glass rounded-xl px-3 py-2 text-xs font-mono text-indigo-300 animate-float delay-1000 shadow-lg shadow-black/30">
                  ⚡ Trigger
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow timeline ────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#09090f] via-[#0d0b1a] to-[#09090f]" />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-3">Workflow</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Opérationnel en{" "}
              <span className="text-shimmer">2 minutes chrono</span>
            </h2>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden sm:block absolute top-10 left-0 right-0 h-px">
              <div className="mx-auto w-3/4 h-full bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              {/* Animated beam */}
              <div
                className="absolute top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-beam"
                style={{ width: "75%", left: "12.5%" }}
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-8">
              {WORKFLOW_STEPS.map((step, i) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className="group text-left focus:outline-none"
                >
                  <div className="flex flex-col items-center sm:items-start gap-4">
                    {/* Icon circle */}
                    <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-2xl ${step.glow} transition-all duration-500 ${activeStep === i ? "scale-110 shadow-2xl" : "scale-100 opacity-60 group-hover:opacity-90 group-hover:scale-105"}`}>
                      {activeStep === i && (
                        <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} animate-pulse-ring`} />
                      )}
                      <span className="relative text-white">{step.icon}</span>
                      {/* Step number */}
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-gray-900">
                        {i + 1}
                      </span>
                    </div>

                    <div>
                      <p className={`font-bold text-sm transition-colors ${activeStep === i ? "text-white" : "text-white/50 group-hover:text-white/80"}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 transition-colors ${activeStep === i ? "text-indigo-300" : "text-white/30"}`}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Active step description */}
            <div className="mt-10 glass rounded-2xl p-6 min-h-[80px] transition-all">
              <p className="text-white/80 leading-relaxed text-center sm:text-left">
                <span className={`inline-block font-bold bg-gradient-to-r ${WORKFLOW_STEPS[activeStep].color} bg-clip-text text-transparent mr-2`}>
                  Étape {activeStep + 1} —
                </span>
                {WORKFLOW_STEPS[activeStep].desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────── */}
      <section className="relative py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#09090f] to-[#0d0b1a]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-3">Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Tout ce dont votre équipe data a besoin
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto">
              Un seul outil. Zéro galère. Des résultats en secondes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl p-6 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-300 cursor-default animate-fade-up`}
                style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}
              >
                {f.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                    {f.badge}
                  </span>
                )}
                {/* Icon with gradient bg */}
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 text-indigo-300 group-hover:from-indigo-600/50 group-hover:to-purple-600/50 group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-sm font-bold text-white/90">{f.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                {/* Bottom gradient line on hover */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-32 overflow-hidden">
        {/* Radial spotlight */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-indigo-600/10 blur-[100px]" />
        </div>
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />

        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <Logo size={56} className="justify-center mb-8" />
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-6">
            Prêt à aller{" "}
            <span className="text-shimmer">10× plus vite</span>{" "}
            sur GTM ?
          </h2>
          <p className="text-lg text-white/50 mb-10 leading-relaxed">
            Rejoignez les équipes data qui délèguent leur GTM à l'intelligence artificielle.
          </p>

          <Button
            size="lg"
            className="h-14 px-10 text-base gap-3 bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-900/60 hover:shadow-indigo-800/70 transition-all border-0"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
            </svg>
            Commencer — c'est gratuit
          </Button>

          <p className="mt-5 text-xs text-white/25">
            Connexion via Google OAuth sécurisé · Aucune donnée stockée sans votre accord
          </p>

          {/* Trust badges */}
          <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
            {["OAuth 2.0", "Aucune CB requise", "Accès révocable", "Open source"].map((t) => (
              <div key={t} className="flex items-center gap-1.5 text-xs text-white/30">
                <svg className="h-3.5 w-3.5 text-indigo-400/70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 sm:flex-row sm:justify-between">
          <Logo size={28} showText={false} />
          <p className="text-xs text-white/20">© {new Date().getFullYear()} TagMind · Tous droits réservés</p>
          <p className="text-xs text-white/20">Propulsé par l'IA · Sécurisé par Google OAuth</p>
        </div>
      </footer>
    </div>
  )
}
