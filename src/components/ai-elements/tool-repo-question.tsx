'use client'

import type { ToolUIPart } from 'ai'
import { MessageCircleQuestionIcon, SparklesIcon } from 'lucide-react'
import { Streamdown } from 'streamdown'

type RepoQuestionInput = {
  question: string
}

type RepoQuestionOutput = {
  answer: string
}

type ToolRepoQuestionProps = {
  state: ToolUIPart['state']
  input?: RepoQuestionInput
  output?: RepoQuestionOutput
  errorText?: string
}

export const ToolRepoQuestion = ({
  input,
  output,
  errorText,
  state,
}: ToolRepoQuestionProps) => {
  const plainOutput: RepoQuestionOutput =
    output && typeof output === 'object'
      ? (JSON.parse(JSON.stringify(output)) as RepoQuestionOutput)
      : ({} as RepoQuestionOutput)

  const isLoading = state === 'input-streaming' || state === 'input-available'
  const hasError = Boolean(errorText) || state === 'output-error'

  return (
    <div className="not-prose mb-4 w-full">
      {/* Question Card */}
      {input?.question && (
        <div className="relative mb-3 rounded-xl border border-border bg-muted/30 p-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <MessageCircleQuestionIcon className="size-4 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-foreground">
                {input.question}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Answer/Loading/Error */}
      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4">
          <div className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm text-muted-foreground">
            Analyzing codebase...
          </span>
        </div>
      ) : hasError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {errorText ?? 'Failed to answer question'}
          </p>
        </div>
      ) : plainOutput.answer ? (
        <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
          {/* Sparkle decoration */}
          <div className="absolute top-3 right-3 opacity-20">
            <SparklesIcon className="size-8 text-accent" />
          </div>
          
          <div className="relative p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-accent/20">
                <SparklesIcon className="size-3.5 text-accent" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                Answer
              </span>
            </div>
            <Streamdown className="text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:rounded [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-background/60 [&_pre]:p-3">
              {plainOutput.answer}
            </Streamdown>
          </div>
        </div>
      ) : null}
    </div>
  )
}

