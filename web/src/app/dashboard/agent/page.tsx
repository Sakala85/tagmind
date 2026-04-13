"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAccounts } from "@/hooks/use-gtm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, User, Sparkles, ArrowRight, Package, Globe, Server, ChevronRight, RefreshCw } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface SelectedContainer {
  accountId: string
  containerId: string
  containerName: string
  accountName: string
}

const SUGGESTED_PROMPTS = [
  "Audit my GTM container and suggest improvements",
  "What tags are firing on all pages?",
  "Check if I have consent mode configured correctly",
  "Find duplicate or unused tags",
  "Help me set up GA4 event tracking",
  "Review my trigger configuration",
]

export default function AgentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramAccountId = searchParams.get("accountId") || ""
  const paramContainerId = searchParams.get("containerId") || ""
  const paramContainerName = searchParams.get("name") || ""
  const paramPrompt = searchParams.get("prompt") || ""

  // Container selection state
  const [selectedContainer, setSelectedContainer] = useState<SelectedContainer | null>(
    paramContainerId
      ? { accountId: paramAccountId, containerId: paramContainerId, containerName: paramContainerName, accountName: "" }
      : null
  )
  const [showPicker, setShowPicker] = useState(!paramContainerId)

  // Fetch accounts for the container picker
  const { accounts, loading: accountsLoading, error: accountsError, refetch: refetchAccounts } = useAccounts()

  const welcomeMessage = `Hello! I'm your GTM Assistant. I'm currently working on **${selectedContainer?.containerName || ""}**.\n\nI can help you analyze this container, suggest optimizations, and make changes.\n\nWhat would you like help with?`

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [pendingAction, setPendingAction] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize welcome message when container is selected
  useEffect(() => {
    if (selectedContainer && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello! I'm your GTM Assistant. I'm currently working on **${selectedContainer.containerName}**.\n\nI can help you analyze this container, suggest optimizations, and make changes.\n\nWhat would you like help with?`,
          timestamp: new Date(),
        },
      ])
    }
  }, [selectedContainer])

  // Auto-send prompt from URL (e.g. from Templates page "Install via Agent")
  const [promptSent, setPromptSent] = useState(false)
  useEffect(() => {
    if (paramPrompt && selectedContainer && messages.length === 1 && !promptSent) {
      setPromptSent(true)
      // Small delay so the welcome message renders first
      setTimeout(() => handleSend(paramPrompt), 300)
    }
  }, [paramPrompt, selectedContainer, messages.length, promptSent])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSelectContainer = (container: SelectedContainer) => {
    setSelectedContainer(container)
    setShowPicker(false)
    setMessages([])
    // Update URL params
    const params = new URLSearchParams()
    params.set("accountId", container.accountId)
    params.set("containerId", container.containerId)
    params.set("name", container.containerName)
    router.replace(`/dashboard/agent?${params.toString()}`)
  }

  const handleChangeContainer = () => {
    setShowPicker(true)
  }

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || !selectedContainer) return

    const { accountId, containerId, containerName } = selectedContainer

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Check if user is confirming pending actions
    if (pendingAction && (messageText.toLowerCase() === "yes" || messageText.toLowerCase() === "oui" || messageText.toLowerCase() === "proceed" || messageText.toLowerCase() === "go")) {
      const actions: any[] = Array.isArray(pendingAction) ? pendingAction : [pendingAction]
      const results: string[] = []
      let hasError = false

      // Track created resource names → IDs so tags can reference triggers created in the same batch
      const createdTriggers: Record<string, string> = {}
      const createdVariables: Record<string, string> = {}

      for (let i = 0; i < actions.length; i++) {
        const currentAction = { ...actions[i] }

        // Normalize: AI may use firingTriggerIds (with 's') or firingTriggerId
        if (currentAction.firingTriggerIds && !currentAction.firingTriggerId) {
          currentAction.firingTriggerId = currentAction.firingTriggerIds
        }
        if (currentAction.blockingTriggerIds && !currentAction.blockingTriggerId) {
          currentAction.blockingTriggerId = currentAction.blockingTriggerIds
        }

        // Resolve trigger name/ref references to real IDs for tag actions
        const resolveTriggerRefs = (ids: string[]) =>
          ids.map((id: string) => {
            // Handle __REF:Name pattern from AI
            const refMatch = id.match(/^__REF:(.+)$/)
            const lookupName = refMatch ? refMatch[1] : id
            if (!/^\d+$/.test(lookupName)) {
              const resolved = createdTriggers[lookupName]
              if (resolved) return resolved
            }
            return refMatch ? lookupName : id
          })

        if ((currentAction.action === "create_tag" || currentAction.action === "update_tag") && currentAction.firingTriggerId) {
          currentAction.firingTriggerId = resolveTriggerRefs(currentAction.firingTriggerId)
          currentAction.firingTriggerIds = currentAction.firingTriggerId
        }
        if ((currentAction.action === "create_tag" || currentAction.action === "update_tag") && currentAction.blockingTriggerId) {
          currentAction.blockingTriggerId = resolveTriggerRefs(currentAction.blockingTriggerId)
          currentAction.blockingTriggerIds = currentAction.blockingTriggerId
        }

        try {
          const res = await fetch("/api/agent/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: "execute action",
              action: currentAction,
              context: { accountId, containerId, containerName },
              history: messages.filter((m) => m.id !== "welcome").map((m) => ({ role: m.role, content: m.content }))
            }),
          })
          const data = await res.json()
          if (data.error) {
            results.push(`❌ ${currentAction.action} "${currentAction.name || currentAction.itemId || ""}" — ${data.error}`)
            hasError = true
          } else {
            // install_server_template returns a detailed summary
            if (currentAction.action === "install_server_template" && data.result?.summary) {
              results.push(data.result.summary)
            } else {
              results.push(`✅ ${currentAction.action} "${currentAction.name || currentAction.itemId || ""}" — OK`)
            }
            // Track created trigger/variable IDs for subsequent actions
            if (currentAction.action === "create_trigger" && data.result?.triggerId) {
              createdTriggers[currentAction.name] = data.result.triggerId
            }
            if (currentAction.action === "create_variable" && data.result?.variableId) {
              createdVariables[currentAction.name] = data.result.variableId
            }
          }
        } catch (error) {
          results.push(`❌ ${currentAction.action} "${currentAction.name || currentAction.itemId || ""}" — Network error`)
          hasError = true
        }
      }

      setPendingAction(null)

      const summary = actions.length > 1
        ? `**${actions.length} actions executed:**\n\n${results.join("\n")}`
        : results[0]

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: summary,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
      return
    }

    // Clear pending actions if user says something else
    if (pendingAction) {
      setPendingAction(null)
    }

    try {
      // Build history from messages (exclude welcome, include current user message)
      const history = [...messages, userMessage]
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          context: { accountId, containerId, containerName },
          history
        }),
      })

      const data = await res.json()

      // Check if AI wants to perform actions (array or single object)
      const responseText = data.response || ""
      const arrayMatch = responseText.match(/\[[\s\S]*\{[\s\S]*"action"[\s\S]*\}[\s\S]*\]/)
      const objectMatch = !arrayMatch && responseText.match(/\{[\s\S]*"action"\s*:\s*"[^"]+"[\s\S]*\}/)

      if (arrayMatch || objectMatch) {
        try {
          let actions: any[]
          if (arrayMatch) {
            actions = JSON.parse(arrayMatch[0])
            if (!Array.isArray(actions)) actions = [actions]
          } else {
            actions = [JSON.parse(objectMatch![0])]
          }

          setPendingAction(actions)

          // Build confirmation summary
          const lines = actions.map((a: any, i: number) =>
            `${i + 1}. **${a.action}** — "${a.name || a.itemId || ""}"`
          )
          const confirmContent = actions.length === 1
            ? `I want to **${actions[0].action}** "${actions[0].name || actions[0].itemId || ""}". Proceed? (yes/no)`
            : `I want to perform **${actions.length} actions**:\n\n${lines.join("\n")}\n\nProceed with all? (yes/no)`

          const confirmMsg: Message = {
            id: `confirm-${Date.now()}`,
            role: "assistant",
            content: confirmContent,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, confirmMsg])
          setIsTyping(false)
          return
        } catch {}
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.error || data.response || "Sorry, I couldn't process your request.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Container Picker Screen ──
  if (showPicker) {
    const allContainers = accounts.flatMap((a) =>
      a.containers.map((c: any) => ({ ...c, accountName: a.name, accountId: a.accountId }))
    )

    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">GTM Agent</h2>
            <p className="text-sm text-muted-foreground">Select a container to start</p>
          </div>
        </div>

        {/* Picker */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Choose a container</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  The agent will focus on the selected container for better accuracy.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetchAccounts()} disabled={accountsLoading}>
                <RefreshCw className={`h-4 w-4 ${accountsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {accountsLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}

            {accountsError && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <p className="text-sm text-red-600">{accountsError}</p>
                <Button variant="outline" size="sm" onClick={() => refetchAccounts()}>
                  Retry
                </Button>
              </div>
            )}

            {!accountsLoading && !accountsError && allContainers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No containers found. Sync your GTM data first.</p>
              </div>
            )}

            {!accountsLoading && !accountsError && allContainers.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {allContainers.map((container: any) => (
                  <button
                    key={container.containerId}
                    onClick={() =>
                      handleSelectContainer({
                        accountId: container.accountId,
                        containerId: container.containerId,
                        containerName: container.name,
                        accountName: container.accountName,
                      })
                    }
                    className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      {container.usageContext?.includes("server") ? (
                        <Server className="h-5 w-5 text-primary" />
                      ) : (
                        <Globe className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{container.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{container.accountName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Chat Screen ──
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">GTM Agent</h2>
          <p className="text-sm text-muted-foreground">AI-powered GTM assistant connected to your MCP server</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleChangeContainer}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          >
            <Package className="h-3 w-3" />
            {selectedContainer?.containerName}
          </button>
          <Badge variant="default" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                  __html: message.content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
              </div>
              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10">
                  <User className="h-4 w-4 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {/* Suggested prompts (only if no user messages) */}
          {messages.length <= 1 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-4">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="flex items-center gap-2 rounded-lg border border-border p-3 text-left text-sm text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-colors"
                >
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your GTM setup..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-white px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Connected to <strong>{selectedContainer?.containerName}</strong> — <button onClick={handleChangeContainer} className="underline hover:text-foreground transition-colors">change container</button>
          </p>
        </div>
      </Card>
    </div>
  )
}

function getAgentResponse(input: string): string {
  const lower = input.toLowerCase()

  if (lower.includes("audit") || lower.includes("review")) {
    return "To run a full audit of your GTM container, head over to the **Audit** tab in the sidebar. It will analyze your tags, triggers, and variables for:\n\n- **Orphan tags** without firing triggers\n- **Paused tags** that may need cleanup\n- **Custom HTML** tags (potential security risk)\n- **Duplicate tag names**\n- **Unused triggers**\n\nWould you like me to explain any of these checks in detail?"
  }

  if (lower.includes("consent") || lower.includes("gdpr")) {
    return "For proper consent mode configuration in GTM, you should ensure:\n\n1. **Google Consent Mode v2** is implemented with `ad_storage`, `analytics_storage`, `ad_user_data`, and `ad_personalization`\n2. Tags that collect personal data should have consent settings set to **\"needed\"**\n3. A **Consent Management Platform (CMP)** triggers the consent update\n4. Default consent state is set to **\"denied\"** for EU users\n\nYou can configure consent settings on individual tags in the Tags view."
  }

  if (lower.includes("ga4") || lower.includes("google analytics")) {
    return "For GA4 event tracking in GTM:\n\n1. Create a **GA4 Configuration tag** (`gaawc`) with your Measurement ID\n2. Create **GA4 Event tags** (`gaawe`) for each custom event\n3. Use triggers like **Click**, **Form Submit**, or **Custom Event** to fire them\n4. Always fire the Config tag on **All Pages**\n\nWant me to help you set up a specific event?"
  }

  if (lower.includes("duplicate") || lower.includes("unused")) {
    return "I can help identify duplicates and unused items. Run the **Audit** from the sidebar — it checks for:\n\n- Tags with identical names\n- Triggers not attached to any tag\n- Tags without firing triggers\n\nAfter the audit, you'll get specific recommendations for each issue found."
  }

  if (lower.includes("trigger")) {
    return "GTM triggers control when tags fire. Best practices:\n\n- **Name triggers descriptively** (e.g., \"Click - CTA Button\" not \"Trigger 1\")\n- **Use specific triggers** over broad ones when possible\n- **Test triggers** in Preview mode before publishing\n- **Remove unused triggers** to keep the container clean\n\nCheck your triggers in the **Tags** section by selecting a container."
  }

  return "I understand you're asking about: **" + input.substring(0, 100) + "**\n\nTo provide the best help, I need to analyze your GTM data. Here's what I suggest:\n\n1. Go to the **Dashboard** to see your accounts and containers\n2. Select a container to view its **tags, triggers, and variables**\n3. Run an **Audit** to get automated recommendations\n\nIs there something specific about your GTM setup I can help with?"
}
