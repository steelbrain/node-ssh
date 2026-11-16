import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono } from 'next/font/google'

import './globals.css'

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://node-ssh.com'),
  title: 'node-ssh: SSH for Node.js with promises',
  description:
    'node-ssh is a promise-based SSH client for Node.js, built on ssh2. Run commands, transfer files and directories over SFTP, open shells and forward ports. Latest release: 14.0.0.',
  openGraph: {
    title: 'node-ssh',
    description: 'A promise-based SSH client for Node.js, built on ssh2. Latest release: 14.0.0.',
    url: 'https://node-ssh.com',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf8' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1110' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={plexMono.variable}>
      <body>{children}</body>
    </html>
  )
}
