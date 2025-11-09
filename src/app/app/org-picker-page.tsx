'use client'

import { appConfig } from '@/app-config'
import { OrganizationCreateDialog } from '@/components/org-creation-dialog'
import { OrganizationLogo } from '@/components/organization-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton-plus'
import { authClient } from '@/lib/auth-client'
import { api } from '@/trpc/react'
import {
  RiAddLine,
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiLogoutCircleLine,
  RiMailLine,
  RiTeamLine,
} from '@remixicon/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function OrgPickerPage() {
  const {
    data: organizations,
    isPending,
    refetch,
  } = authClient.useListOrganizations()

  const {
    data: invitations,
    isPending: isInvitationsPending,
    refetch: refetchInvitations,
  } = api.organization.listUserInvitations.useQuery()

  const router = useRouter()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [processingInvitationId, setProcessingInvitationId] = useState<
    string | null
  >(null)

  const handleOrgClick = (orgSlug: string) => {
    router.push(appConfig.getBaseOrgPath(orgSlug))
  }

  const handleCreateSuccess = () => {
    refetch()
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitationId(invitationId)
      await authClient.organization.acceptInvitation({
        invitationId,
      })
      await refetchInvitations()
      refetch() // Refresh organizations list as user now has access to new org
      toast.success('Invitation accepted successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation'
      toast.error(message ?? 'Failed to accept invitation')
    } finally {
      setProcessingInvitationId(null)
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      setProcessingInvitationId(invitationId)
      await authClient.organization.rejectInvitation({
        invitationId,
      })
      await refetchInvitations()
      toast.success('Invitation rejected')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reject invitation'
      toast.error(message ?? 'Failed to reject invitation')
    } finally {
      setProcessingInvitationId(null)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-2">
              <Skeleton className="text-2xl">Select Your Team</Skeleton>
            </div>
            <div>
              <Skeleton className="text-sm">
                Choose a team to access your dashboard
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
                        Organization Name
                      </Skeleton>
                    </div>
                    <div>
                      <Skeleton className="text-sm">@orgslug</Skeleton>
                    </div>
                  </div>
                  <div className="size-4 bg-muted animate-pulse rounded" />
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
    <div className="min-h-screen bg-background flex flex-col gap-6 items-center justify-center p-8">
      {/* Pending Invitations */}
      {!isInvitationsPending && invitations && invitations.length > 0 && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl flex items-center justify-center gap-2">
              <RiMailLine className="size-5" />
              Pending Invitations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You have {invitations.length} pending team invitation
              {invitations.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {invitations.map((invitation, index) => (
                <div key={invitation.id}>
                  <div className="p-3 -mx-3 rounded-md border border-dashed border-muted">
                    <div className="flex items-center gap-3">
                      <OrganizationLogo
                        org={invitation.organization}
                        className="size-9"
                        withFancyBorder
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {invitation.organization.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{invitation.organization.slug}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          isLoading={processingInvitationId === invitation.id}
                          disabled={processingInvitationId !== null}
                          icon={RiCheckLine}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectInvitation(invitation.id)}
                          isLoading={processingInvitationId === invitation.id}
                          disabled={processingInvitationId !== null}
                          icon={RiCloseLine}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                  {index < invitations.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations */}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Your Team</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose a team to access your dashboard
          </p>
        </CardHeader>
        <CardContent>
          {!organizations?.length ? (
            <>
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="mb-4 flex items-center justify-center">
                  <RiTeamLine size={48} className="text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No teams found
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                  You don&apos;t have access to any teams yet. Create your first
                  team to get started.
                </p>
                <OrganizationCreateDialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                  onSuccess={handleCreateSuccess}
                  trigger={<Button icon={RiAddLine}>Create Team</Button>}
                />
              </div>
            </>
          ) : (
            <div className="space-y-0">
              {organizations.map((org, index) => (
                <div key={org.id}>
                  <div
                    className="group cursor-pointer p-3 -mx-3 rounded-md hover:bg-accent transition-colors"
                    onClick={() => handleOrgClick(org.slug)}
                  >
                    <div className="flex items-center gap-3">
                      <OrganizationLogo
                        org={org}
                        className="size-9"
                        withFancyBorder
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-sidebar-primary transition-colors">
                          {org.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{org.slug}
                        </p>
                      </div>
                      <RiArrowRightLine className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {index < organizations.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
              <Separator className="my-4" />
              <OrganizationCreateDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleCreateSuccess}
                trigger={
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    icon={RiAddLine}
                  >
                    Create Team
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => authClient.signOut()}
        icon={RiLogoutCircleLine}
        className="text-muted-foreground hover:text-foreground"
      >
        Sign Out
      </Button>
    </div>
  )
}
