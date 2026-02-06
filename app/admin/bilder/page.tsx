"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Trash2, Copy, Check, ImageIcon as ImageIconIcon, Loader2 } from "lucide-react"
import useSWR from "swr"

interface BlobFile {
  url: string
  pathname: string
  filename: string
  size: number
  uploadedAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminBilderPage() {
  const [uploading, setUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ files: BlobFile[] }>("/api/list", fetcher)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setDeleteError(null)

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Upload fehlgeschlagen")
        }
      }

      mutate()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Upload fehlgeschlagen")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }, [mutate])

  const handleDelete = useCallback(async (url: string) => {
    if (!confirm("Möchten Sie dieses Bild wirklich löschen?")) return

    setDeleteError(null)

    try {
      const response = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Löschen fehlgeschlagen")
      }

      mutate()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Löschen fehlgeschlagen")
    }
  }, [mutate])

  const copyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      setDeleteError("Kopieren fehlgeschlagen")
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <section className="py-16 px-6 bg-secondary">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Bildverwaltung
            </h1>
            <p className="text-xl text-muted-foreground">
              Verwalten Sie die Bilder Ihrer Webseite
            </p>
          </div>
        </section>

        <section className="py-12 px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            {/* Upload Section */}
            <div className="bg-secondary p-8 rounded-2xl mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Neues Bild hochladen</h2>
              <p className="text-muted-foreground mb-6">
                Laden Sie Bilder hoch (JPEG, PNG, WebP, GIF - max. 10MB)
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <Label htmlFor="file-upload" className="sr-only">
                    Datei auswählen
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Wird hochgeladen...</span>
                  </div>
                )}
              </div>

              {deleteError && (
                <p className="mt-4 text-destructive text-sm">{deleteError}</p>
              )}
            </div>

            {/* Files List */}
            <div className="bg-muted p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-foreground mb-6">Hochgeladene Bilder</h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <p className="text-center py-12 text-muted-foreground">
                  Fehler beim Laden der Bilder. Bitte stellen Sie sicher, dass Vercel Blob korrekt konfiguriert ist.
                </p>
              ) : data?.files && data.files.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.files.map((file) => (
                    <div
                      key={file.url}
                      className="bg-background rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="aspect-video relative bg-muted">
                        {file.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img
                            src={file.url || "/placeholder.svg"}
                            alt={file.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIconIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-medium text-foreground truncate mb-1" title={file.filename}>
                          {file.filename}
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {formatFileSize(file.size)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(file.url)}
                            className="flex-1"
                          >
                            {copiedUrl === file.url ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Kopiert
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                URL kopieren
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(file.url)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Noch keine Bilder hochgeladen. Laden Sie Ihr erstes Bild hoch!
                  </p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-secondary p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-foreground mb-4">Anleitung</h2>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li>Laden Sie ein Bild über das Formular oben hoch</li>
                <li>Nach dem Upload erscheint das Bild in der Liste</li>
                <li>Klicken Sie auf URL kopieren um die Bild-URL zu kopieren</li>
                <li>Fügen Sie die URL in der Datei lib/images.ts ein, um das Bild auf der Webseite anzuzeigen</li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
