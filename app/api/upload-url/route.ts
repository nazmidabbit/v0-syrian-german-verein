import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"
import { getAuthUser, canEdit } from "@/lib/auth"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !canEdit(user.role)) {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 })
    }

    const { filename, type, size } = await request.json()

    if (!filename || !type || typeof size !== "number") {
      return NextResponse.json({ error: "filename, type, size erforderlich" }, { status: 400 })
    }

    const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const videoTypes = ["video/mp4", "video/webm", "video/quicktime"]
    const allowedTypes = [...imageTypes, ...videoTypes]
    const isVideo = videoTypes.includes(type)

    if (!allowedTypes.includes(type)) {
      return NextResponse.json(
        { error: "Nur Bilder (JPEG, PNG, WebP, GIF) und Videos (MP4, WebM, MOV) sind erlaubt" },
        { status: 400 }
      )
    }

    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024
    if (size > maxSize) {
      return NextResponse.json(
        { error: `Datei ist zu groß. Maximale Größe: ${isVideo ? "500MB" : "10MB"}` },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const ext = (filename.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase()
    const uniqueName = `${crypto.randomUUID()}.${ext}`
    const folder = isVideo ? "videos" : "images"
    const filePath = `${folder}/${uniqueName}`

    const { data, error } = await supabase.storage
      .from("uploads")
      .createSignedUploadUrl(filePath)

    if (error || !data) {
      console.error("Signed Upload URL Fehler:", error)
      return NextResponse.json({ error: "Upload-URL konnte nicht erzeugt werden" }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error("upload-url Fehler:", err)
    return NextResponse.json({ error: "Fehler beim Erzeugen der Upload-URL" }, { status: 500 })
  }
}
