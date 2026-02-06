import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { blobs } = await list()

    const files = blobs.map((blob) => ({
      ...blob,
      filename: blob.pathname.split("/").pop() || "unbekannt",
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Fehler beim Auflisten der Dateien:", error)
    return NextResponse.json({ error: "Dateien konnten nicht geladen werden" }, { status: 500 })
  }
}
