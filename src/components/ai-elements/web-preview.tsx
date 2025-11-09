'use client'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, RefreshCw, ExternalLink } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type WebPreviewTab = {
  id: string
  url: string
  label?: string
}

export type WebPreviewContextValue = {
  url: string
  setUrl: (url: string) => void
  tabs: WebPreviewTab[]
  activeTabId: string | null
  setActiveTabId: (id: string | null) => void
  consoleOpen: boolean
  setConsoleOpen: (open: boolean) => void
  // Reload support
  reloadActiveTab: () => void
  reloadToken: number
  // Loading state for current active tab (for controls like reload button)
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null)

export const useWebPreview = () => {
  const context = useContext(WebPreviewContext)
  if (!context) {
    throw new Error('WebPreview components must be used within a WebPreview')
  }
  return context
}

export type WebPreviewProps = ComponentProps<'div'> & {
  defaultUrl?: string
  defaultUrls?: WebPreviewTab[]
  onUrlChange?: (url: string) => void
}

export const WebPreview = ({
  className,
  children,
  defaultUrl = '',
  defaultUrls,
  onUrlChange,
  ...props
}: WebPreviewProps) => {
  const hasTabs = defaultUrls && defaultUrls.length > 0
  const initialTabs = hasTabs
    ? defaultUrls
    : defaultUrl
      ? [{ id: 'default', url: defaultUrl }]
      : []
  const [tabs, setTabs] = useState<WebPreviewTab[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | null>(
    tabs[0]?.id ?? null,
  )
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const url = activeTab?.url ?? ''

  const handleUrlChange = (newUrl: string) => {
    if (activeTabId) {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, url: newUrl } : tab,
        ),
      )
    }
    onUrlChange?.(newUrl)
  }

  const reloadActiveTab = () => {
    // Bump token to force remount of active iframe via key
    setReloadToken((token) => token + 1)
  }

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl: handleUrlChange,
    tabs,
    activeTabId,
    setActiveTabId,
    consoleOpen,
    setConsoleOpen,
    reloadActiveTab,
    reloadToken,
    isLoading,
    setIsLoading,
  }

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex size-full flex-col rounded-lg border bg-card',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  )
}

export type WebPreviewNavigationProps = ComponentProps<'div'>

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => {
  const { tabs, activeTabId, setActiveTabId } = useWebPreview()
  const hasMultipleTabs = tabs.length > 1

  if (hasMultipleTabs) {
    return (
      <div
        className={cn('flex flex-col border-b bg-muted/30', className)}
        {...props}
      >
        <Tabs
          value={activeTabId ?? undefined}
          onValueChange={(value) => setActiveTabId(value)}
          className="w-full"
        >
          <TabsList className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group relative h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none"
              >
                <span className="max-w-[200px] truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1 p-2">{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-center gap-1 border-b p-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string
}

export const WebPreviewNavigationButton = ({
  onClick,
  disabled,
  tooltip,
  children,
  ...props
}: WebPreviewNavigationButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-8 w-8 p-0 hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export type WebPreviewUrlProps = ComponentProps<typeof Input>

export const WebPreviewUrl = ({
  value,
  onChange,
  onKeyDown,
  ...props
}: WebPreviewUrlProps) => {
  const { url, setUrl } = useWebPreview()
  const [inputValue, setInputValue] = useState(url)

  // Sync input value with context URL when it changes externally
  useEffect(() => {
    setInputValue(url)
  }, [url])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    onChange?.(event)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLInputElement
      setUrl(target.value)
    }
    onKeyDown?.(event)
  }

  return (
    <Input
      className="h-8 flex-1 text-sm"
      onChange={onChange ?? handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Enter URL..."
      value={value ?? inputValue}
      {...props}
    />
  )
}

export type WebPreviewBodyProps = Omit<ComponentProps<'iframe'>, 'loading'> & {
  loading?: ReactNode
  timeoutMs?: number
}

export const WebPreviewBody = ({
  className,
  loading,
  src,
  timeoutMs = 15000,
  ...props
}: WebPreviewBodyProps) => {
  const { tabs, activeTabId, reloadToken, url, reloadActiveTab, setIsLoading } = useWebPreview()
  const hasMultipleTabs = tabs.length > 1

  // Track loading state per tab to avoid external race conditions
  const [isLoadingById, setIsLoadingById] = useState<Record<string, boolean>>({})
  const [timedOutById, setTimedOutById] = useState<Record<string, boolean>>({})
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({})

  const activeId = activeTabId ?? (tabs[0]?.id ?? null)
  const activeUrl = src ?? url

  const beginLoading = (tabId: string | null) => {
    if (!tabId) return
    // clear existing timer
    if (timeoutRefs.current[tabId]) {
      clearTimeout(timeoutRefs.current[tabId] as ReturnType<typeof setTimeout>)
      timeoutRefs.current[tabId] = null
    }
    setIsLoadingById((prev) => ({ ...prev, [tabId]: true }))
    setTimedOutById((prev) => ({ ...prev, [tabId]: false }))
    setIsLoading(true)
    timeoutRefs.current[tabId] = setTimeout(() => {
      setTimedOutById((prev) => ({ ...prev, [tabId]: true }))
    }, timeoutMs)
  }

  const finishLoading = (tabId: string | null) => {
    if (!tabId) return
    if (timeoutRefs.current[tabId]) {
      clearTimeout(timeoutRefs.current[tabId] as ReturnType<typeof setTimeout>)
      timeoutRefs.current[tabId] = null
    }
    setIsLoadingById((prev) => ({ ...prev, [tabId]: false }))
    setTimedOutById((prev) => ({ ...prev, [tabId]: false }))
    // Only clear global loading if finishing the currently active tab
    if (tabId === activeId) {
      setIsLoading(false)
    }
  }

  // Start loading on tab/nav/reload changes and when URL changes
  useEffect(() => {
    if (activeId) {
      beginLoading(activeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeUrl, reloadToken])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((t) => t && clearTimeout(t))
    }
  }, [])

  const renderOverlay = (tabId: string, currentUrl: string) => {
    const isLoading = isLoadingById[tabId]
    const isTimedOut = timedOutById[tabId]
    if (!isLoading && !isTimedOut) return null
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/90">
        <div className="flex flex-col items-center gap-3">
          {isTimedOut ? (
            <>
              <p className="text-sm text-muted-foreground">
                Preview timed out. The app may still be starting.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="default" onClick={reloadActiveTab}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Reload
                </Button>
                {currentUrl ? (
                  <a href={currentUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      Open
                    </Button>
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </>
          )}
          {/* Preserve custom loading slot for backward compatibility */}
          {loading}
        </div>
      </div>
    )
  }

  if (hasMultipleTabs) {
    return (
      <div className="relative flex-1">
        <Tabs value={activeTabId ?? undefined} className="size-full">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="relative m-0 size-full"
            >
              <iframe
                className={cn('size-full', className)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                // Key ensures only active tab iframe is remounted on reload
                key={
                  activeTabId === tab.id
                    ? `active-${reloadToken}-${tab.id}`
                    : `tab-${tab.id}`
                }
                src={(src ?? tab.url) || undefined}
                title={`Preview - ${tab.label ?? tab.url}`}
                onLoad={() => finishLoading(tab.id)}
                {...props}
              />
              {renderOverlay(tab.id, (src ?? tab.url) || '')}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <iframe
        className={cn('size-full', className)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        key={`single-${reloadToken}`}
        src={(src ?? url) || undefined}
        title="Preview"
        onLoad={() => finishLoading(activeId)}
        {...props}
      />
      {activeId ? renderOverlay(activeId, (src ?? url) || '') : null}
    </div>
  )
}

export type WebPreviewReloadButtonProps = Omit<
  WebPreviewNavigationButtonProps,
  'onClick' | 'children'
>

export const WebPreviewReloadButton = ({
  tooltip = 'Reload',
  ...props
}: WebPreviewReloadButtonProps) => {
  const { reloadActiveTab, isLoading } = useWebPreview()
  return (
    <WebPreviewNavigationButton
      onClick={reloadActiveTab}
      tooltip={tooltip}
      {...props}
    >
      <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
    </WebPreviewNavigationButton>
  )
}

export type WebPreviewConsoleProps = ComponentProps<'div'> & {
  logs?: Array<{
    level: 'log' | 'warn' | 'error'
    message: string
    timestamp: Date
  }>
}

export const WebPreviewConsole = ({
  className,
  logs = [],
  children,
  ...props
}: WebPreviewConsoleProps) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview()

  return (
    <Collapsible
      className={cn('border-t bg-muted/50 font-mono text-sm', className)}
      onOpenChange={setConsoleOpen}
      open={consoleOpen}
      {...props}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50"
          variant="ghost"
        >
          Console
          <ChevronDownIcon
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              consoleOpen && 'rotate-180',
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'px-4 pb-4',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
        )}
      >
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No console output</p>
          ) : (
            logs.map((log, index) => (
              <div
                className={cn(
                  'text-xs',
                  log.level === 'error' && 'text-destructive',
                  log.level === 'warn' && 'text-yellow-600',
                  log.level === 'log' && 'text-foreground',
                )}
                key={`${log.timestamp.getTime()}-${index}`}
              >
                <span className="text-muted-foreground">
                  {log.timestamp.toLocaleTimeString()}
                </span>{' '}
                {log.message}
              </div>
            ))
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
