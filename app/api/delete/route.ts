import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "Keine URL angegeben" }, { status: 400 })
    }

    const supabase = getSupabase()

    // Pfad aus der URL extrahieren
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/storage/v1/object/public/uploads/")
    const filePath = pathParts[1]

    if (!filePath) {
      return NextResponse.json({ error: "Ungültige URL" }, { status: 400 })
    }

    const { error } = await supabase.storage
      .from("uploads")
      .remove([filePath])

    if (error) {
      return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lösch-Fehler:", error)
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}
