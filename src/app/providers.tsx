import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TRPCReactProvider } from '@/trpc/react'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Provider as AIStoreProvider } from '@ai-sdk-tools/store'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCReactProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Toaster position="top-right" />
        <AIStoreProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </AIStoreProvider>
      </ThemeProvider>
      <ReactQueryDevtools
        initialIsOpen={false}
        position="bottom"
        buttonPosition="bottom-right"
      />
    </TRPCReactProvider>
  )
}
