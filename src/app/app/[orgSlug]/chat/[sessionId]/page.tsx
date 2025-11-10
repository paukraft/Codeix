'use client'

import { appConfig } from '@/app-config'
import {
  useWebPreview,
  WebPreview,
  WebPreviewBody,
  WebPreviewNavigation,
  WebPreviewReloadButton,
  WebPreviewUrl,
} from '@/components/ai-elements/web-preview'
import { SlidingNumber } from '@/components/animate-ui/primitives/texts/sliding-number'
import { AppLayout } from '@/components/app-layout'
import { EnvVarsDialog } from '@/components/env-vars-dialog'
import Logo from '@/components/logo'
import { ModelSelect } from '@/components/model-select'
import { SessionChat } from '@/components/session-chat'
import { SimpleTooltip } from '@/components/simple-tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Skeleton } from '@/components/ui/skeleton-plus'
import { WebPreviewActionsProvider } from '@/contexts/web-preview-actions-context'
import { useOrg } from '@/hooks/use-org'
import { api } from '@/trpc/react'
import { useChatReset } from '@ai-sdk-tools/store'
import { RiDeleteBinLine, RiEraserLine, RiTimeLine } from '@remixicon/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const WebPreviewWrapper = ({
  previewTabs,
  urls,
  reloadPreviewRef,
}: {
  previewTabs: { id: string; url: string; label: string }[] | undefined
  urls: { id: string; url: string; port: number; label: string | null }[]
  reloadPreviewRef: React.MutableRefObject<(() => void) | null>
}) => {
  return (
    <WebPreview defaultUrls={previewTabs} defaultUrl={urls[0]?.url || ''}>
      <WebPreviewReloader reloadPreviewRef={reloadPreviewRef} />
      <WebPreviewNavigation>
        <WebPreviewReloadButton />
        <WebPreviewUrl readOnly placeholder="Your app here..." />
      </WebPreviewNavigation>
      <WebPreviewBody />
    </WebPreview>
  )
}

const WebPreviewReloader = ({
  reloadPreviewRef,
}: {
  reloadPreviewRef: React.MutableRefObject<(() => void) | null>
}) => {
  const { reloadActiveTab } = useWebPreview()

  // Expose reload function via ref
  useEffect(() => {
    reloadPreviewRef.current = reloadActiveTab
  }, [reloadActiveTab, reloadPreviewRef])

  return null
}

const SandboxCountdown = ({ createdAt }: { createdAt: Date }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now()
      const created = new Date(createdAt).getTime()
      const elapsed = now - created
      const oneHourMs = 60 * 60 * 1000
      const remaining = Math.max(0, oneHourMs - elapsed)
      setRemainingSeconds(Math.floor(remaining / 1000))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60

  const isLowTime = remainingSeconds < 5 * 60 // Less than 5 minutes
  const isExpired = remainingSeconds === 0

  return (
    <SimpleTooltip
      title={
        isExpired ? 'Sandbox expired' : `Sandbox lifetime: 1 hour from creation`
      }
    >
      <div
        className={`flex items-center gap-2 text-sm ${
          isExpired
            ? 'text-destructive'
            : isLowTime
              ? 'text-orange-500'
              : 'text-muted-foreground'
        }`}
      >
        <RiTimeLine className="size-4" />
        <div className="flex items-center gap-0.5 font-mono">
          <SlidingNumber
            number={minutes}
            padStart
            initiallyStable
            transition={{ stiffness: 300, damping: 30 }}
          />
          <span>:</span>
          <SlidingNumber
            number={seconds}
            padStart
            initiallyStable
            transition={{ stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </SimpleTooltip>
  )
}

export default function SessionPage() {
  const { orgSlug } = useOrg()
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const utils = api.useUtils()
  const resetChat = useChatReset()
  const reloadPreviewRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    resetChat()
  }, [sessionId, resetChat])

  const { data: session, isLoading } = api.agentSession.get.useQuery(
    {
      orgSlug,
      sessionId,
    },
    {
      enabled: !!orgSlug && !!sessionId,
    },
  )

  const deleteSession = api.agentSession.delete.useMutation({
    onSuccess: async () => {
      toast.success('Session deleted')
      // Clear global chat store so UI resets immediately
      resetChat()
      await Promise.all([utils.agentSession.list.invalidate({ orgSlug })])
      router.push(`/app/${orgSlug}/chat`)
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete session')
    },
  })

  // No external loading toggles; handled internally by WebPreview

  if (isLoading) {
    return (
      <AppLayout
        header={{
          title: (
            <div className="flex items-center gap-2">
              <Logo />
              <span>{appConfig.appName}</span>
            </div>
          ),
        }}
      >
        <div className="h-[calc(100vh-200px)]">
          <Skeleton className="h-full w-full" />
        </div>
      </AppLayout>
    )
  }

  if (!session) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <p className="text-muted-foreground">Session not found</p>
        </div>
      </AppLayout>
    )
  }

  const urls = session.publicSandboxUrls ?? []
  const hasPreview = urls.length > 0

  const previewTabs =
    urls.length > 0
      ? urls.map((url) => ({
          id: url.id,
          url: url.url,
          label: url.label ?? `Port ${url.port}`,
        }))
      : undefined

  return (
    <AppLayout
      header={{
        title: session.repository?.name,
        actions: (
          <div className="flex items-center gap-3">
            <SandboxCountdown createdAt={session.createdAt} />
            <div className="h-4 w-px bg-border" />
            <ModelSelect />
            <EnvVarsDialog sessionId={sessionId} orgSlug={orgSlug} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetChat()
                toast.success('Chat cleared')
              }}
            >
              <RiEraserLine />
              Clear chat
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  isLoading={deleteSession.isPending}
                >
                  <RiDeleteBinLine />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will stop the sandbox and remove this session
                    permanently.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteSession.mutate({ orgSlug, sessionId })}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
      }}
    >
      <WebPreviewActionsProvider
        reloadPreview={() => reloadPreviewRef.current?.()}
      >
        <div className="h-[calc(100vh-150px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={hasPreview ? 50 : 100} minSize={30}>
              <SessionChat sessionId={sessionId} />
            </ResizablePanel>
            {hasPreview && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50} minSize={30}>
                  <WebPreviewWrapper
                    previewTabs={previewTabs}
                    urls={urls}
                    reloadPreviewRef={reloadPreviewRef}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </WebPreviewActionsProvider>
    </AppLayout>
  )
}
