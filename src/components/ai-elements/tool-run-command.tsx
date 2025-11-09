'use client'

import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { ToolUIPart } from 'ai'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  TerminalIcon,
  XCircleIcon,
} from 'lucide-react'
import { useState } from 'react'

type RunCommandInput = {
  command: string
  args?: string[]
  background?: boolean
}

type RunCommandOutput = {
  exitCode?: number
  stdout?: string
  stderr?: string
  background?: boolean
  runId?: string
}

type ToolRunCommandProps = {
  state: ToolUIPart['state']
  input?: RunCommandInput
  output?: RunCommandOutput
  errorText?: string
}

export const ToolRunCommand = ({
  input,
  output,
  errorText,
}: ToolRunCommandProps) => {
  const [isOpen, setIsOpen] = useState(true)

  const fullCommand = input?.args
    ? `${input.command} ${input.args.join(' ')}`
    : input?.command ?? ''

  // Ensure output is a plain object
  const plainOutput: RunCommandOutput =
    output && typeof output === 'object'
      ? (JSON.parse(JSON.stringify(output)) as RunCommandOutput)
      : {}

  const stdout =
    typeof plainOutput.stdout === 'string' && plainOutput.stdout.length > 0
      ? plainOutput.stdout
      : undefined
  const stderr =
    typeof plainOutput.stderr === 'string' && plainOutput.stderr.length > 0
      ? plainOutput.stderr
      : undefined

  const isSuccess = plainOutput.exitCode === 0
  const hasOutput = Boolean(stdout ?? stderr)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="not-prose mb-4 w-full rounded-md border border-border bg-background/80 shadow-sm">
        {/* Terminal Header */}
        {hasOutput ? (
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                <TerminalIcon className="size-4 text-accent" />
                <code className="text-foreground">
                  {fullCommand || '(pending command)'}
                </code>
              </div>
              <div className="flex items-center gap-2">
                {plainOutput.background && (
                  <Badge variant="secondary" className="text-xs">
                    Background
                  </Badge>
                )}
                {plainOutput.exitCode !== undefined && (
                  <Badge
                    variant={isSuccess ? 'default' : 'destructive'}
                    className="gap-1.5 text-xs"
                  >
                    {isSuccess ? (
                      <CheckCircleIcon className="size-3" />
                    ) : (
                      <XCircleIcon className="size-3" />
                    )}
                    Exit {plainOutput.exitCode}
                  </Badge>
                )}
                <ChevronDownIcon
                  className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </CollapsibleTrigger>
        ) : (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
              <TerminalIcon className="size-4 text-accent" />
              <span className="text-accent/80">›</span>
              <code className="text-foreground">
                {fullCommand || '(pending command)'}
              </code>
            </div>
            <div className="flex items-center gap-2">
              {plainOutput.background && (
                <Badge variant="secondary" className="text-xs">
                  Background
                </Badge>
              )}
              {plainOutput.exitCode !== undefined && (
                <Badge
                  variant={isSuccess ? 'default' : 'destructive'}
                  className="gap-1.5 text-xs"
                >
                  {isSuccess ? (
                    <CheckCircleIcon className="size-3" />
                  ) : (
                    <XCircleIcon className="size-3" />
                  )}
                  Exit {plainOutput.exitCode}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Output */}
        <CollapsibleContent>
          <div className="max-h-[45vh] overflow-auto bg-background font-mono text-xs text-foreground">
            {stdout && (
              <pre className="whitespace-pre-wrap break-words p-3 text-foreground">
                {stdout}
              </pre>
            )}
            {stderr && (
              <pre className="whitespace-pre-wrap break-words border-t border-border bg-destructive/10 p-3 text-destructive">
                {stderr}
              </pre>
            )}
            {errorText && (
              <pre className="whitespace-pre-wrap break-words border-t border-border bg-destructive/10 p-3 text-destructive">
                {errorText}
              </pre>
            )}
            {!hasOutput && !errorText && plainOutput.exitCode !== undefined && (
              <div className="p-3 text-muted-foreground text-xs">
                (no output)
              </div>
            )}
          </div>
        </CollapsibleContent>

        {/* Background Run Info */}
        {plainOutput.background && plainOutput.runId && (
          <div className="px-3 py-2 bg-muted/30 border-t text-muted-foreground text-xs">
            Run ID: <code className="font-mono">{plainOutput.runId}</code>
          </div>
        )}
      </div>
    </Collapsible>
  )
}
