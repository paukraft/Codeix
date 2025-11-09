'use client'

import { createContext, useContext, type ReactNode } from 'react'

type WebPreviewActionsContextValue = {
  reloadPreview: () => void
}

const WebPreviewActionsContext =
  createContext<WebPreviewActionsContextValue | null>(null)

export const useWebPreviewActions = () => {
  const context = useContext(WebPreviewActionsContext)
  if (!context) {
    throw new Error(
      'useWebPreviewActions must be used within WebPreviewActionsProvider',
    )
  }
  return context
}

export const useWebPreviewActionsOptional = () => {
  return useContext(WebPreviewActionsContext)
}

export const WebPreviewActionsProvider = ({
  children,
  reloadPreview,
}: {
  children: ReactNode
  reloadPreview: () => void
}) => {
  return (
    <WebPreviewActionsContext.Provider value={{ reloadPreview }}>
      {children}
    </WebPreviewActionsContext.Provider>
  )
}

