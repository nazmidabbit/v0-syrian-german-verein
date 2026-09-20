/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // IMAP-/Mail-Pakete nicht bundeln, sondern zur Laufzeit aus node_modules laden
  serverExternalPackages: ['imapflow', 'mailparser', 'nodemailer'],
  images: {
    unoptimized: true,
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