'use client'

import { cn } from '@/lib/utils'
import { diffLines } from 'diff'
import { useMemo } from 'react'

type EditToolInput = {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

type EditToolOutput = {
  metadata?: {
    diff?: string
    filediff?: {
      file: string
      before: string
      after: string
      additions: number
      deletions: number
    }
  }
  title?: string
  output?: string
}

type EditToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error'

type ToolEditProps = {
  state: EditToolState
  input?: EditToolInput
  output?: EditToolOutput
  errorText?: string
  className?: string
}

export const ToolEdit = ({
  state,
  input,
  output,
  errorText,
  className,
}: ToolEditProps) => {
  const fileName = useMemo(() => {
    const path =
      input?.filePath ?? output?.title ?? output?.metadata?.filediff?.file ?? ''
    const parts = path.split('/')
    return parts[parts.length - 1] ?? path
  }, [input?.filePath, output?.title, output?.metadata?.filediff?.file])

  const fileBaseName = useMemo(() => {
    return fileName.replace(/\.[^.]+$/, '')
  }, [fileName])

  const fileExtension = useMemo(() => {
    const match = /\.([^.]+)$/.exec(fileName)
    return match ? match[1] : ''
  }, [fileName])

  const diffData = useMemo(() => {
    // Use metadata if available for better performance
    if (
      output?.metadata?.filediff?.before &&
      output?.metadata?.filediff?.after
    ) {
      return diffLines(
        output.metadata.filediff.before,
        output.metadata.filediff.after,
      )
    }

    // Fall back to input data
    if (input?.oldString && input?.newString) {
      return diffLines(input.oldString, input.newString)
    }

    return null
  }, [input?.oldString, input?.newString, output?.metadata?.filediff])

  const stats = useMemo(() => {
    // Use metadata stats if available
    if (output?.metadata?.filediff) {
      return {
        additions: output.metadata.filediff.additions || 0,
        deletions: output.metadata.filediff.deletions || 0,
      }
    }

    // Calculate from diff data
    if (!diffData) return { additions: 0, deletions: 0 }

    let additions = 0
    let deletions = 0

    diffData.forEach((change) => {
      if (change.added) additions += change.count || 0
      if (change.removed) deletions += change.count || 0
    })

    return { additions, deletions }
  }, [diffData, output?.metadata?.filediff])

  return (
    <div className={cn('rounded-lg border bg-background/50', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <span className="font-mono text-sm">
            {fileBaseName}
            {fileExtension && (
              <span className="text-muted-foreground">.{fileExtension}</span>
            )}
          </span>
        </div>
        {state === 'output-available' && (
          <div className="flex items-center gap-3 text-xs">
            {stats.additions > 0 && (
              <span className="text-green-600 dark:text-green-400">
                +{stats.additions}
              </span>
            )}
            {stats.deletions > 0 && (
              <span className="text-red-600 dark:text-red-400">
                -{stats.deletions}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[400px] overflow-y-auto">
        {(state === 'input-streaming' || state === 'input-available') && (
          <div className="p-3">
            {input?.filePath && (
              <div className="text-sm text-muted-foreground mb-2">
                {state === 'input-streaming'
                  ? 'Preparing edit...'
                  : 'Editing file...'}
              </div>
            )}
            {input?.oldString && input?.newString && diffData && (
              <div className="font-mono text-xs leading-relaxed opacity-60">
                {diffData
                  .map((change, idx) => {
                    const lines = change.value.split('\n')
                    const displayLines = lines.slice(0, -1)

                    if (change.added) {
                      return (
                        <div key={idx}>
                          {displayLines.slice(0, 3).map((line, lineIdx) => (
                            <div
                              key={lineIdx}
                              className="bg-green-500/10 px-3 py-0.5 text-green-700 dark:text-green-300"
                            >
                              <span className="mr-2 select-none opacity-60">
                                +
                              </span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }

                    if (change.removed) {
                      return (
                        <div key={idx}>
                          {displayLines.slice(0, 3).map((line, lineIdx) => (
                            <div
                              key={lineIdx}
                              className="bg-red-500/10 px-3 py-0.5 text-red-700 dark:text-red-300"
                            >
                              <span className="mr-2 select-none opacity-60">
                                -
                              </span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      )
                    }

                    return null
                  })
                  .slice(0, 2)}
              </div>
            )}
          </div>
        )}

        {state === 'output-error' && (
          <div className="p-3 text-sm text-red-600 dark:text-red-400">
            {errorText ?? 'An error occurred'}
          </div>
        )}

        {state === 'output-available' && diffData && (
          <div className="font-mono text-xs leading-relaxed">
            {diffData.map((change, idx) => {
              const lines = change.value.split('\n')
              const displayLines = lines.slice(0, -1) // Remove trailing empty line

              if (change.added) {
                return (
                  <div key={idx}>
                    {displayLines.map((line, lineIdx) => (
                      <div
                        key={lineIdx}
                        className="bg-green-500/10 px-3 py-0.5 text-green-700 dark:text-green-300"
                      >
                        <span className="mr-2 select-none opacity-60">+</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                )
              }

              if (change.removed) {
                return (
                  <div key={idx}>
                    {displayLines.map((line, lineIdx) => (
                      <div
                        key={lineIdx}
                        className="bg-red-500/10 px-3 py-0.5 text-red-700 dark:text-red-300"
                      >
                        <span className="mr-2 select-none opacity-60">-</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                )
              }

              // Context lines - show first 2 and last 2
              const contextLines = displayLines
              const showEllipsis = contextLines.length > 6
              const visibleLines = showEllipsis
                ? [
                    ...contextLines.slice(0, 2),
                    '...',
                    ...contextLines.slice(-2),
                  ]
                : contextLines

              return (
                <div key={idx}>
                  {visibleLines.map((line, lineIdx) => (
                    <div
                      key={lineIdx}
                      className="px-3 py-0.5 text-muted-foreground/60"
                    >
                      {line === '...' ? (
                        <span className="opacity-50">{line}</span>
                      ) : (
                        <>
                          <span className="mr-2 select-none opacity-30">│</span>
                          <span>{line}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
