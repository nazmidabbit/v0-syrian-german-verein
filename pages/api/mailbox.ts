import { NextApiRequest, NextApiResponse } from "next"
import Imap from "imap"
import simpleParser from "mailparser"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const imapConfig = {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASS,
    host: "imap.ionos.de",
    port: 993,
    tls: true,
  }

  const imap = new Imap(imapConfig)

  function openInbox(cb: (err: any, box: any) => void) {
    imap.openBox("INBOX", true, cb)
  }

  imap.once("ready", function () {
    openInbox(function (err, box) {
      if (err) {
        imap.end()
        return res.status(500).json({ error: err.message })
      }
      const results: any[] = []
      const f = imap.seq.fetch("1:10", {
        bodies: "",
        struct: true,
      })
      f.on("message", function (msg, seqno) {
        msg.on("body", function (stream, info) {
          simpleParser(stream, (err, mail) => {
            if (!err) {
              results.push({
                from: mail.from?.text,
                subject: mail.subject,
                date: mail.date,
                body: mail.text,
              })
            }
          })
        })
      })
      f.once("end", function () {
        imap.end()
        return res.status(200).json({ emails: results })
      })
    })
  })

  imap.once("error", function (err) {
    return res.status(500).json({ error: err.message })
  })

  imap.connect()
}
