"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileBox,
  Upload,
  Trash2,
  Tags,
  Zap,
  Variable,
  Monitor,
  AlertCircle,
  CheckCircle2,
  FileJson,
  ArrowRight,
  X,
  Shield,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface TemplateConstant {
  name: string
  placeholder: string
}

interface Template {
  id: string
  name: string
  description: string | null
  fileName: string
  constants: string // JSON
  tagCount: number
  triggerCount: number
  variableCount: number
  clientCount: number
  createdAt: string
}

const DEFAULT_FILE_NAMES = new Set([
  "GTM-KJTWSMJ7_workspace13.json",
  "GTM-5CC6D6DB_workspace7.json",
])

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState("")
  const [uploadDesc, setUploadDesc] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTemplates(data.templates || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadError(null)
    // Auto-fill name from filename if empty
    if (!uploadName) {
      const baseName = file.name.replace(/\.json$/i, "").replace(/[_-]/g, " ")
      setUploadName(baseName)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      setUploadError("Please provide a name and select a file.")
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      const content = await uploadFile.text()

      // Validate JSON
      try {
        const parsed = JSON.parse(content)
        if (!parsed.containerVersion) {
          setUploadError("Invalid GTM export: missing containerVersion. Please upload a valid GTM container export JSON.")
          setUploading(false)
          return
        }
      } catch {
        setUploadError("The file is not valid JSON.")
        setUploading(false)
        return
      }

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName.trim(),
          description: uploadDesc.trim() || null,
          fileName: uploadFile.name,
          content,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setUploadSuccess(true)
      setUploadName("")
      setUploadDesc("")
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""

      // Refresh list
      await fetchTemplates()

      // Auto-close after short delay
      setTimeout(() => {
        setShowUpload(false)
        setUploadSuccess(false)
      }, 1500)
    } catch (e: any) {
      setUploadError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return
    setDeleting(id)
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" })
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`)
      const data = await res.json()
      if (!data.template?.content) return
      const blob = new Blob([data.template.content], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error("Download failed:", e)
    }
  }

  const parseConstants = (json: string): TemplateConstant[] => {
    try {
      return JSON.parse(json)
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Server Templates</h2>
          <p className="text-sm text-muted-foreground">
            Upload GTM server container exports and install them via the Agent
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Template
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upload New Template</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowUpload(false); setUploadError(null); setUploadSuccess(false) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Upload a GTM container export JSON file (from GTM → Admin → Export Container)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Template Name *</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Sirdata Server Config"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <input
                type="text"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="e.g. Full server-side tracking with GA4, Meta CAPI, Google Ads"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">JSON File *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                  uploadFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                {uploadFile ? (
                  <div className="flex items-center gap-2 text-sm">
                    <FileJson className="h-5 w-5 text-primary" />
                    <span className="font-medium">{uploadFile.name}</span>
                    <span className="text-muted-foreground">({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select a .json file</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Template uploaded successfully!
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadName.trim()} className="gap-2">
              {uploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Template List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileBox className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-1">No templates yet</p>
            <p className="text-sm text-muted-foreground">
              Upload a GTM server container export to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((template) => {
            const constants = parseConstants(template.constants)
            const isExpanded = expandedId === template.id
            const isDefault = DEFAULT_FILE_NAMES.has(template.fileName)

            return (
              <Card key={template.id} className={cn("transition-all hover:shadow-md", isDefault && "border-primary/20")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", isDefault ? "bg-primary/15" : "bg-primary/10")}>
                        {isDefault ? <Shield className="h-5 w-5 text-primary" /> : <FileBox className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {isDefault && <Badge className="text-[10px] px-1.5 py-0">Default</Badge>}
                        </div>
                        {template.description && (
                          <CardDescription className="mt-0.5">{template.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/agent?prompt=${encodeURIComponent(`Installe le template serveur "${template.name}" dans mon conteneur serveur. Analyse mon conteneur client pour remplir automatiquement les constantes.`)}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <ArrowRight className="h-3.5 w-3.5" />
                          Install via Agent
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDownload(template.id, template.fileName)}
                        title="Download template JSON"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleting === template.id}
                        >
                          {deleting === template.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  {/* Stats */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="gap-1">
                      <Tags className="h-3 w-3" />
                      {template.tagCount} tags
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {template.triggerCount} triggers
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Variable className="h-3 w-3" />
                      {template.variableCount} variables
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Monitor className="h-3 w-3" />
                      {template.clientCount} clients
                    </Badge>
                  </div>

                  {/* Constants */}
                  {constants.length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>{constants.length} configurable constants</span>
                        <span className={cn("transition-transform", isExpanded && "rotate-90")}>›</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                          <div className="space-y-1.5">
                            {constants.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="font-mono text-foreground">{c.name}</span>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {c.placeholder}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[10px] text-muted-foreground">
                            These constants will be auto-filled by the Agent from your client container data.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 text-xs text-muted-foreground">
                  <span>{template.fileName}</span>
                  <span className="mx-2">·</span>
                  <span>Uploaded {new Date(template.createdAt).toLocaleDateString()}</span>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
