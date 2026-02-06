import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "Keine URL angegeben" }, { status: 400 })
    }

    // Lösche von Vercel Blob
    await del(url)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lösch-Fehler:", error)
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}
