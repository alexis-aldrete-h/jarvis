import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css'
import { GanttProvider } from '@/contexts/GanttContext'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Jarvis - Personal AI Assistant',
  description: 'Your personal assistant for tasks, week organization, and finances',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${sora.className} antialiased`} suppressHydrationWarning>
        <GanttProvider>
          {children}
        </GanttProvider>
      </body>
    </html>
  )
}

