'use client'

import { RepoDialog } from '@/components/repo-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton-plus'
import { useOrg } from '@/hooks/use-org'
import type { repositoryRouter } from '@/server/api/routers/repository-router'
import { api } from '@/trpc/react'
import {
  RiAddLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiGitRepositoryLine,
  RiMoreLine,
  RiPencilLine,
} from '@remixicon/react'
import type { inferRouterOutputs } from '@trpc/server'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type RouterOutput = inferRouterOutputs<typeof repositoryRouter>
type Repository = NonNullable<RouterOutput['list']>[number]

const RepositoryActions = ({
  repository,
  onEdit,
}: {
  repository: Repository
  onEdit: (repo: Repository) => void
}) => {
  const { orgSlug } = useOrg()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const utils = api.useUtils()

  const deleteMutation = api.repository.delete.useMutation({
    onSuccess: () => {
      void utils.repository.list.invalidate({ orgSlug })
      setShowDeleteDialog(false)
      toast.success('Repository deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate({
      orgSlug,
      id: repository.id,
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 shadow-none text-muted-foreground/60"
            onClick={(e) => e.stopPropagation()}
          >
            <RiMoreLine className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              onEdit(repository)
            }}
          >
            <RiPencilLine className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
            variant="destructive"
            className="dark:data-[variant=destructive]:focus:bg-destructive/10"
          >
            <RiDeleteBin6Line className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border"
              aria-hidden="true"
            >
              <RiErrorWarningLine className="opacity-80" size={16} />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently remove{' '}
                <span className="font-medium">{repository.name}</span> from your
                repositories.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Repository'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function ChatPage() {
  const { orgSlug } = useOrg()
  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { data: repositories = [], isLoading } = api.repository.list.useQuery({
    orgSlug,
  })

  const utils = api.useUtils()

  const createSession = api.agentSession.create.useMutation({
    onSuccess: async (session) => {
      await utils.agentSession.list.invalidate({ orgSlug })
      router.push(`/app/${orgSlug}/chat/${session.id}`)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create session')
    },
  })

  const handleRepoClick = (repositoryId: string) => {
    createSession.mutate({ orgSlug, repositoryId })
  }

  const handleEdit = (repo: Repository) => {
    setEditingRepo(repo)
    setIsEditDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-2">
              <Skeleton className="text-2xl">Select Repository</Skeleton>
            </div>
            <div>
              <Skeleton className="text-sm">
                Choose a repository to start a session
              </Skeleton>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 p-3">
                  <div className="size-9 rounded-md bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="mb-1">
                      <Skeleton className="font-medium">
                        Repository Name
                      </Skeleton>
                    </div>
                    <div>
                      <Skeleton className="text-sm">
                        github.com/org/repo
                      </Skeleton>
                    </div>
                  </div>
                </div>
                {i < 2 && <Separator className="my-2" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <RepoDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        trigger={<div style={{ display: 'none' }} />}
        onSuccess={() => {
          setIsCreateDialogOpen(false)
        }}
      />
      <RepoDialog
        repository={editingRepo ?? undefined}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingRepo(null)
          }
        }}
        trigger={<div style={{ display: 'none' }} />}
        onSuccess={() => {
          setEditingRepo(null)
          setIsEditDialogOpen(false)
        }}
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Select Repository</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a repository to start a session
            </p>
          </CardHeader>
          <CardContent>
            {!repositories.length ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="mb-4 flex items-center justify-center">
                  <RiGitRepositoryLine
                    size={48}
                    className="text-muted-foreground/40"
                  />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No repositories found
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  You don&apos;t have any repositories yet. Add a repository to
                  get started.
                </p>
                <Button
                  icon={RiAddLine}
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Add Repository
                </Button>
              </div>
            ) : (
              <div className="space-y-0">
                {repositories.map((repo, index) => (
                  <div key={repo.id}>
                    <div
                      className={`group p-3 -mx-3 rounded-md transition-colors ${
                        createSession.isPending
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-accent/50'
                      }`}
                      onClick={() =>
                        !createSession.isPending && handleRepoClick(repo.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                          <RiGitRepositoryLine className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{repo.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {repo.url}
                          </p>
                        </div>
                        <RepositoryActions
                          repository={repo}
                          onEdit={handleEdit}
                        />
                      </div>
                    </div>
                    {index < repositories.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
                <Separator className="my-4" />
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  icon={RiAddLine}
                  onClick={() => setIsCreateDialogOpen(true)}
                  disabled={createSession.isPending}
                >
                  Add Repository
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
