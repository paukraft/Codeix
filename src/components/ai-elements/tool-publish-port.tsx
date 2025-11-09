'use client'

import { Badge } from '@/components/ui/badge'
import type { ToolUIPart } from 'ai'
import { ExternalLinkIcon, GlobeIcon, ServerIcon } from 'lucide-react'
import { useState } from 'react'

type PublishPortInput = {
  port: number
  label?: string
}

type PublishPortOutput = {
  url: string
  host: string
  port: number
  id: string
}

type ToolPublishPortProps = {
  state: ToolUIPart['state']
  input?: PublishPortInput
  output?: PublishPortOutput
  errorText?: string
}

export const ToolPublishPort = ({
  input,
  output,
  errorText,
  state,
}: ToolPublishPortProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!output?.url) return
    await navigator.clipboard.writeText(output.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const plainOutput: PublishPortOutput =
    output && typeof output === 'object'
      ? (JSON.parse(JSON.stringify(output)) as PublishPortOutput)
      : ({} as PublishPortOutput)

  const isLoading = state === 'input-streaming'
  const hasError = Boolean(errorText) || state === 'output-error'

  return (
    <div className="not-prose mb-4 w-full rounded-md border border-border bg-gradient-to-br from-background to-muted/20 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <GlobeIcon className="size-4 text-accent" />
        <span className="text-sm font-medium text-foreground">
          Published Port
        </span>
        {input?.port && (
          <Badge variant="secondary" className="text-xs font-mono">
            :{input.port}
          </Badge>
        )}
      </div>

      {/* Content - always render structure */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Publishing port...
          </div>
        ) : hasError ? (
          <div className="text-sm text-destructive">
            {errorText ?? 'Failed to publish port'}
          </div>
        ) : plainOutput.url ? (
          <>
            {/* Label */}
            {input?.label && (
              <p className="text-sm text-muted-foreground">{input.label}</p>
            )}

            {/* Main URL Display */}
            <button
              onClick={handleCopy}
              className="group relative w-full rounded-lg border border-border bg-background/50 p-3 text-left transition-all hover:border-accent hover:bg-accent/5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 overflow-hidden">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Public URL
                  </div>
                  <div className="font-mono text-sm text-foreground break-all">
                    {plainOutput.url}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={plainOutput.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </a>
                  <div className="rounded p-1.5 text-muted-foreground transition-colors group-hover:text-accent">
                    {copied ? (
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Host Info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ServerIcon className="size-3" />
              <span className="font-mono">{plainOutput.host}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

