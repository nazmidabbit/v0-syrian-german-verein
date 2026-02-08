"use client"
import React, { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function AdminMailPage() {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedMail, setSelectedMail] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/mailbox")
      .then(res => res.json())
      .then(data => {
        if (data.emails) {
          setEmails(data.emails)
        } else if (data.error) {
          setError(data.error)
        }
        setLoading(false)
      })
      .catch(err => {
        setError("Fehler beim Laden der E-Mails.")
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20 px-6">
        <h1 className="text-3xl font-bold mb-6">E-Mail Postfach</h1>
        {selectedMail ? (
          <div className="mb-8 border p-6 rounded bg-background">
            <button className="mb-4 px-4 py-2 bg-primary text-white rounded" onClick={() => setSelectedMail(null)}>
              Zurück zur Übersicht
            </button>
            <div><strong>Von:</strong> {selectedMail.from}</div>
            <div><strong>Betreff:</strong> {selectedMail.subject}</div>
            <div><strong>Datum:</strong> {selectedMail.date?.toString()}</div>
            <div className="mt-4"><strong>Inhalt:</strong><br />{selectedMail.body}</div>
            {selectedMail.attachments && selectedMail.attachments.length > 0 && (
              <div className="mt-4">
                <strong>Anhänge:</strong>
                <ul>
                  {selectedMail.attachments.map((att: any, idx: number) => (
                    <li key={idx}>
                      <a href={att.url} target="_blank" rel="noopener noreferrer">{att.filename}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : loading ? (
          <p>Lade E-Mails...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <ul className="space-y-4">
            {emails.length === 0 ? (
              <li>Keine E-Mails gefunden.</li>
            ) : (
              emails.map((mail: any, idx) => (
                <li key={idx} className="border p-4 rounded cursor-pointer hover:bg-secondary" onClick={() => setSelectedMail(mail)}>
                  <div><strong>Von:</strong> {mail.from}</div>
                  <div><strong>Betreff:</strong> {mail.subject}</div>
                  <div><strong>Datum:</strong> {mail.date?.toString()}</div>
                  <div><strong>Inhalt:</strong> {mail.body.slice(0, 80)}...</div>
                </li>
              ))
            )}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  )
}
