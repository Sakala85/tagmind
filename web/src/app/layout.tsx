import type { Metadata } from "next"
import { SessionProvider } from "@/components/providers/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "TagMind — Agent IA pour Google Tag Manager",
  description: "Gérez vos tags GTM en langage naturel. Créez, auditez et publiez des tags, triggers et variables grâce à l'agent IA TagMind.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
