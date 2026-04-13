import React from "react"

interface LogoProps {
  size?: number
  className?: string
  showText?: boolean
  dark?: boolean
}

export function Logo({ size = 40, className = "", showText = true, dark = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TagMind logo"
      >
        {/* Background rounded square */}
        <rect width="40" height="40" rx="10" fill="url(#grad)" />

        {/* Tag shape */}
        <path
          d="M9 9h12.5a2 2 0 0 1 1.42.59l8.5 8.5a2 2 0 0 1 0 2.83l-8.5 8.5A2 2 0 0 1 21.5 30H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z"
          fill="white"
          fillOpacity="0.18"
        />

        {/* AI spark / brain lines */}
        <circle cx="27" cy="13" r="2.5" fill="white" fillOpacity="0.95" />
        <line x1="15" y1="16" x2="23" y2="16" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="15" y1="20" x2="21" y2="20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="15" y1="24" x2="19" y2="24" stroke="white" strokeWidth="1.8" strokeLinecap="round" />

        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div className="leading-tight">
          <span className={`text-xl font-bold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
            Tag<span className="text-indigo-400">Mind</span>
          </span>
          <p className={`text-xs ${dark ? "text-white/40" : "text-muted-foreground"}`}>AI GTM Agent</p>
        </div>
      )}
    </div>
  )
}
