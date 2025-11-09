import '@/styles/globals.css'

import { appConfig } from '@/app-config'
import { Providers } from '@/app/providers'
import { type Metadata } from 'next'
import { Urbanist } from 'next/font/google'

export const metadata: Metadata = {
  title: {
    default: appConfig.appName,
    template: `%s | ${appConfig.appName}`,
  },
  description: 'Blank Pau App',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

const fontSans = Urbanist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html>
      <body className={`${fontSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
