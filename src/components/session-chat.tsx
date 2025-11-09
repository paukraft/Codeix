'use client'

import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputController,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import { ToolEdit } from '@/components/ai-elements/tool-edit'
import { ToolPublishPort } from '@/components/ai-elements/tool-publish-port'
import { ToolRepoQuestion } from '@/components/ai-elements/tool-repo-question'
import { ToolRunCommand } from '@/components/ai-elements/tool-run-command'
import {
  ChatContainerContent,
  ChatContainerRoot,
} from '@/components/ui/chat-container'
import { useWebPreviewActionsOptional } from '@/contexts/web-preview-actions-context'
import { useOrg } from '@/hooks/use-org'
import { chatConfig } from '@/lib/chat-store'
import { DEFAULT_MODEL, isValidModel } from '@/lib/models'
import { api } from '@/trpc/react'
import { useChat } from '@ai-sdk-tools/store'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ToolUIPart,
  type UIMessage,
} from 'ai'
import { useEffect, useRef, useState } from 'react'
import { useLocalStorage } from 'usehooks-ts'

const SuggestionsWithController = () => {
  const controller = usePromptInputController()

  return (
    <Suggestions className="mx-auto">
      <Suggestion
        onClick={(suggestion) => {
          controller.textInput.setInput(suggestion)
        }}
        suggestion="Start the app"
      />
      <Suggestion
        onClick={(suggestion) => {
          controller.textInput.setInput(suggestion)
        }}
        suggestion="What is the tech stack of the project?"
      />
      <Suggestion
        onClick={(suggestion) => {
          controller.textInput.setInput(suggestion)
        }}
        suggestion="Where is the entry point of the app?"
      />
    </Suggestions>
  )
}

export const SessionChat = ({ sessionId }: { sessionId: string }) => {
  const { orgSlug } = useOrg()
  const utils = api.useUtils()
  const webPreviewActions = useWebPreviewActionsOptional()
  const [storedModel] = useLocalStorage('chat-model', DEFAULT_MODEL)
  const model = isValidModel(storedModel) ? storedModel : DEFAULT_MODEL

  // Load persisted messages from localStorage
  const storageKey = `chat-messages-${sessionId}`
  const [persistedMessages, setPersistedMessages] = useLocalStorage<
    UIMessage[]
  >(storageKey, [])
  const [isInitialized, setIsInitialized] = useState(false)

  const { messages, sendMessage, status, stop, addToolResult, setMessages } =
    useChat({
      transport: new DefaultChatTransport({
        api: chatConfig.api,
        body: { sessionId, model },
      }),
      onFinish: ({ messages: finishedMessages }) => {
        // Persist messages to localStorage after completion
        setPersistedMessages(finishedMessages)
        chatConfig.onFinish(finishedMessages)
      },
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      // Handle client-side tools
      onToolCall: async ({ toolCall }) => {
        if (toolCall.toolName === 'refreshWebPreview') {
          const input = toolCall.input as { reason?: string } | undefined

          // Trigger the web preview reload
          webPreviewActions?.reloadPreview()

          // Return the result to the AI
          void addToolResult({
            tool: 'refreshWebPreview',
            toolCallId: toolCall.toolCallId,
            output: {
              refreshed: true,
              reason: input?.reason ?? 'Manual refresh',
              timestamp: new Date().toISOString(),
            },
          })
        }
      },
    })

  // Load persisted messages on mount
  useEffect(() => {
    if (!isInitialized && persistedMessages.length > 0) {
      setMessages(persistedMessages)
      setIsInitialized(true)
    } else if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [persistedMessages, isInitialized, setMessages])

  // Persist messages when they change (debounced to avoid excessive writes)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!isInitialized) return

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Save immediately if messages are empty (chat cleared) or debounce for streaming updates
    if (messages.length === 0) {
      setPersistedMessages([])
    } else {
      // Debounce saves during streaming to avoid excessive localStorage writes
      saveTimeoutRef.current = setTimeout(() => {
        setPersistedMessages(messages)
      }, 500)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, isInitialized, setPersistedMessages])

  // Track which publishPort tool calls we've already invalidated for
  const invalidatedToolCallIds = useRef(new Set<string>())

  // Invalidate session when publishPort completes
  useEffect(() => {
    if (!orgSlug) return

    messages.forEach((message) => {
      message.parts.forEach((part) => {
        if (!('type' in part) || !String(part.type).startsWith('tool-')) return

        const toolPart = part as ToolUIPart
        const toolName = toolPart.type.split('-').slice(1).join('-')

        if (
          toolName === 'publishPort' &&
          toolPart.state === 'output-available' &&
          !invalidatedToolCallIds.current.has(toolPart.toolCallId)
        ) {
          invalidatedToolCallIds.current.add(toolPart.toolCallId)
          void utils.agentSession.get.invalidate({ orgSlug, sessionId })
        }
      })
    })
  }, [messages, orgSlug, sessionId, utils.agentSession.get])

  const isLoading = status === 'submitted' || status === 'streaming'

  const abortIncompleteToolCalls = () => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return

    last.parts.forEach((part) => {
      if (!('type' in part) || !String((part as { type?: string }).type ?? '').startsWith('tool-'))
        return

      const toolPart = part as ToolUIPart
      const isFinished =
        toolPart.state === 'output-available' ||
        toolPart.state === 'output-error'
      if (isFinished) return

      const toolName = toolPart.type.split('-').slice(1).join('-')
      void addToolResult({
        tool: toolName,
        toolCallId: toolPart.toolCallId,
        output: {
          aborted: true,
          reason: 'Stopped by user',
          timestamp: new Date().toISOString(),
        },
      })
    })
  }

  const handleStop = () => {
    stop()
    abortIncompleteToolCalls()
  }

  const handleSendMessage = async (promptMessage: PromptInputMessage) => {
    const hasText = Boolean(promptMessage.text)
    const hasAttachments = Boolean(promptMessage.files?.length)

    if (!(hasText || hasAttachments) || isLoading) return

    const userMessage = promptMessage.text?.trim() ?? 'Sent with attachments'
    sendMessage({ text: userMessage })
  }

  return (
    <PromptInputProvider>
      <div className="flex flex-col h-full">
        <ChatContainerRoot className="flex-1">
          <ChatContainerContent className="p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-semibold mt-4">
                    What can we build together?
                  </p>
                </div>
              </div>
            ) : (
              <Conversation>
                <ConversationContent>
                  {messages.map((msg) => (
                    <Message from={msg.role} key={msg.id}>
                      <MessageContent>
                        {msg.parts.map((part, i) => {
                          switch (part.type) {
                            case 'text':
                              return (
                                <MessageResponse key={`${msg.id}-${i}`}>
                                  {part.text}
                                </MessageResponse>
                              )
                            case 'reasoning':
                              return (
                                <Reasoning
                                  key={`${msg.id}-${i}`}
                                  className="w-full"
                                  isStreaming={
                                    status === 'streaming' &&
                                    i === msg.parts.length - 1 &&
                                    msg.id === messages[messages.length - 1]?.id
                                  }
                                >
                                  <ReasoningTrigger />
                                  <ReasoningContent>
                                    {part.text}
                                  </ReasoningContent>
                                </Reasoning>
                              )
                            case 'dynamic-tool': {
                              const dynamicToolPart = part as any

                              // Default tool rendering
                              const hasInput =
                                dynamicToolPart.input !== undefined &&
                                dynamicToolPart.input !== null
                              return (
                                <Tool key={`${msg.id}-${i}`}>
                                  <ToolHeader
                                    type={`tool-${dynamicToolPart.toolName}`}
                                    state={dynamicToolPart.state}
                                  />
                                  <ToolContent>
                                    {hasInput ? (
                                      <ToolInput
                                        input={dynamicToolPart.input}
                                      />
                                    ) : null}
                                    <ToolOutput
                                      output={dynamicToolPart.output}
                                      errorText={dynamicToolPart.errorText}
                                    />
                                  </ToolContent>
                                </Tool>
                              )
                            }
                            default:
                              if (part.type.startsWith('tool-')) {
                                const toolPart = part as ToolUIPart
                                const toolName = toolPart.type
                                  .split('-')
                                  .slice(1)
                                  .join('-')

                                // Custom UI for edit tool
                                if (toolName === 'edit') {
                                  return (
                                    <ToolEdit
                                      key={`${msg.id}-${i}`}
                                      state={toolPart.state}
                                      input={toolPart.input as any}
                                      output={toolPart.output as any}
                                      errorText={toolPart.errorText}
                                    />
                                  )
                                }

                                // Custom UI for runCommand tool
                                if (toolName === 'runCommand') {
                                  return (
                                    <ToolRunCommand
                                      key={`${msg.id}-${i}`}
                                      state={toolPart.state}
                                      input={toolPart.input as any}
                                      output={toolPart.output as any}
                                      errorText={toolPart.errorText}
                                    />
                                  )
                                }

                                // Custom UI for publishPort tool
                                if (toolName === 'publishPort') {
                                  return (
                                    <ToolPublishPort
                                      key={`${msg.id}-${i}`}
                                      state={toolPart.state}
                                      input={toolPart.input as any}
                                      output={toolPart.output as any}
                                      errorText={toolPart.errorText}
                                    />
                                  )
                                }

                                // Custom UI for repoFastQuestionAswerer tool
                                if (toolName === 'repoFastQuestionAswerer') {
                                  return (
                                    <ToolRepoQuestion
                                      key={`${msg.id}-${i}`}
                                      state={toolPart.state}
                                      input={toolPart.input as any}
                                      output={toolPart.output as any}
                                      errorText={toolPart.errorText}
                                    />
                                  )
                                }

                                // Default tool rendering
                                const hasInput =
                                  toolPart.input !== undefined &&
                                  toolPart.input !== null
                                return (
                                  <Tool key={`${msg.id}-${i}`}>
                                    <ToolHeader
                                      type={toolPart.type}
                                      state={toolPart.state}
                                    />
                                    <ToolContent>
                                      {hasInput ? (
                                        <ToolInput
                                          input={
                                            toolPart.input as ToolUIPart['input']
                                          }
                                        />
                                      ) : null}
                                      <ToolOutput
                                        output={
                                          toolPart.output as ToolUIPart['output']
                                        }
                                        errorText={toolPart.errorText}
                                      />
                                    </ToolContent>
                                  </Tool>
                                )
                              }
                              return null
                          }
                        })}
                      </MessageContent>
                    </Message>
                  ))}
                  {isLoading && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex items-center gap-2">
                          <Loader />
                          Working very hard...
                        </div>
                      </MessageContent>
                    </Message>
                  )}
                </ConversationContent>
              </Conversation>
            )}
          </ChatContainerContent>
        </ChatContainerRoot>

        <div className="p-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-2xl">
              <SuggestionsWithController />
            </div>
          )}

          <PromptInput
            onSubmit={handleSendMessage}
            className="mt-4 w-full max-w-2xl mx-auto relative"
          >
            <PromptInputTextarea
              className="pr-12 min-h-[60px]"
              placeholder="What would you like to build?"
            />
            <PromptInputSubmit
              className="absolute bottom-1 right-1"
              status={isLoading ? 'streaming' : status}
              type={isLoading ? 'button' : 'submit'}
              aria-label={isLoading ? 'Stop' : 'Submit'}
              onClick={isLoading ? handleStop : undefined}
            />
          </PromptInput>
        </div>
      </div>
    </PromptInputProvider>
  )
}
