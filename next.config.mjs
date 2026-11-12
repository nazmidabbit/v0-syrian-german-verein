/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // IMAP-/Mail-Pakete nicht bundeln, sondern zur Laufzeit aus node_modules laden
  serverExternalPackages: ['imapflow', 'mailparser', 'nodemailer'],
  // Bilder laufen ueber die Vercel-Bildoptimierung: Handyfotos mit 6 MB aus
  // Supabase werden einmal verkleinert (WebP, passende Breite) und am
  // Vercel-Rand gecacht. Supabase bekommt pro Bild und Groesse nur einen
  // Abruf statt einen je Besucher — das schont Egress und verhindert die
  // 429-Fehler des Storage bei vielen gleichzeitigen Anfragen.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/webp'],
    // Dateinamen sind UUIDs und aendern sich nie — 30 Tage sind sicher
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Kamera nur fuer eigene Seiten (QR-Scanner der Einlasskontrolle) —
          // fremde eingebettete Inhalte bekommen sie nicht, und der Browser
          // fragt weiterhin bei jedem Zugriff nach
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
}

export default nextConfig