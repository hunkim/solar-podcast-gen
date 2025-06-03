import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'Video Podcast Generator - AI-Powered Content Creation',
  description: 'Transform documents and text into engaging video and podcast content using AI. Generate professional podcast scripts with Solar Pro2 LLM, web research, and real-time streaming.',
  keywords: ['podcast generator', 'AI content creation', 'video podcast', 'script generation', 'document to podcast', 'text to speech'],
  authors: [{ name: 'Video Podcast Generator' }],
  creator: 'Video Podcast Generator',
  publisher: 'Video Podcast Generator',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/podcast-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        url: '/podcast-icon.svg',
      },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Video Podcast Generator - AI-Powered Content Creation',
    description: 'Transform documents and text into engaging video and podcast content using AI',
    type: 'website',
    images: [
      {
        url: '/podcast-icon.svg',
        width: 64,
        height: 64,
        alt: 'Video Podcast Generator Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Video Podcast Generator',
    description: 'Transform documents and text into engaging video and podcast content using AI',
    images: ['/podcast-icon.svg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
