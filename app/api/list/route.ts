import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase.storage
      .from("uploads")
      .list("images", { sortBy: { column: "created_at", order: "desc" } })

    if (error) {
      return NextResponse.json({ error: "Dateien konnten nicht geladen werden" }, { status: 500 })
    }

    const files = (data || [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => {
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(`images/${f.name}`)

        return {
          url: urlData.publicUrl,
          pathname: `images/${f.name}`,
          filename: f.name,
          size: f.metadata?.size || 0,
          uploadedAt: f.created_at,
        }
      })

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Fehler beim Auflisten der Dateien:", error)
    return NextResponse.json({ error: "Dateien konnten nicht geladen werden" }, { status: 500 })
  }
}
