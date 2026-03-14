import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Keine Datei angegeben" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Nur Bilder (JPEG, PNG, WebP, GIF) sind erlaubt" },
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Datei ist zu groß. Maximale Größe: 10MB" },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    // Eindeutigen Dateinamen generieren
    const ext = file.name.split(".").pop() || "jpg"
    const uniqueName = `${crypto.randomUUID()}.${ext}`
    const filePath = `images/${uniqueName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabase.storage
      .from("uploads")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Supabase Storage Fehler:", error)
      return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error("Upload Fehler:", error)
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 })
  }
}
