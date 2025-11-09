'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { TimeAgo } from '@/components/time-ago'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FancyTable } from '@/components/ui/fancy-table'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserAvatar } from '@/components/user-avatar'
import { useOrg } from '@/hooks/use-org'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import type { organizationRouter } from '@/server/api/routers/organization-router'
import { api } from '@/trpc/react'
import {
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiMailLine,
  RiMoreLine,
  RiRefreshLine,
  RiShieldLine,
  RiTimeLine,
  RiUser2Line,
  RiUserAddLine,
  RiUserLine,
} from '@remixicon/react'
import { type ColumnDef, type FilterFn } from '@tanstack/react-table'
import type { inferRouterOutputs } from '@trpc/server'
import { useMemo } from 'react'

import { OrganizationSettingsHeader } from '../header'

type RouterOutput = inferRouterOutputs<typeof organizationRouter>
type Member = NonNullable<RouterOutput['getMembers']>[number]
type Invitation = NonNullable<RouterOutput['listInvitations']>[number]

const inviteMemberFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'owner']),
})

type Role = 'admin' | 'member' | 'owner'

const roleFilterFn: FilterFn<Member> = (
  row,
  columnId,
  filterValue: string[],
) => {
  if (!filterValue?.length) return true
  const role = row.getValue(columnId)
  return typeof role === 'string' && filterValue.includes(role)
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'owner':
      return 'Owner'
    case 'admin':
      return 'Admin'
    case 'member':
      return 'Member'
    default:
      return role
  }
}

const getMembersColumns = (): ColumnDef<Member>[] => [
  {
    header: 'Member',
    accessorKey: 'user.name',
    cell: ({ row }) => {
      const member = row.original
      return (
        <div className="flex items-center gap-3">
          <UserAvatar user={member.user} className="size-8">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <RiUserLine className="size-4 text-muted-foreground" />
            </div>
          </UserAvatar>
          <div className="flex flex-col">
            <span className="font-medium">
              {member.user.name || 'Unnamed User'}
            </span>
            <span className="text-sm text-muted-foreground">
              {member.user.email}
            </span>
          </div>
        </div>
      )
    },
    size: 250,
    enableHiding: false,
  },
  {
    header: 'Role',
    accessorKey: 'role',
    cell: ({ row }) => {
      const member = row.original
      const role = member.role
      const roleLabel = getRoleLabel(role)

      return (
        <div className="flex items-center h-full">
          <Badge
            variant="outline"
            className={cn(
              'gap-1 py-0.5 px-2 text-sm',
              role === 'owner' &&
                'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
              role === 'admin' &&
                'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
              role === 'member' && 'text-muted-foreground',
            )}
          >
            {role === 'owner' && (
              <RiShieldLine
                className="text-purple-600 dark:text-purple-400"
                size={14}
                aria-hidden="true"
              />
            )}
            {role === 'admin' && (
              <RiShieldLine
                className="text-blue-600 dark:text-blue-400"
                size={14}
                aria-hidden="true"
              />
            )}
            {role === 'member' && (
              <RiUserLine
                className="text-muted-foreground"
                size={14}
                aria-hidden="true"
              />
            )}
            {roleLabel}
          </Badge>
        </div>
      )
    },
    size: 120,
    filterFn: roleFilterFn,
  },
  {
    header: 'Joined',
    accessorKey: 'createdAt',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        <TimeAgo date={row.original.createdAt} />
      </span>
    ),
    size: 120,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <MemberRowActions member={row.original} />,
    size: 60,
    enableHiding: false,
  },
]

const getInvitationsColumns = (): ColumnDef<Invitation>[] => [
  {
    header: 'Email',
    accessorKey: 'email',
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <RiMailLine className="size-4 text-muted-foreground" />
          </div>
          <span className="font-medium">{row.getValue('email')}</span>
        </div>
      )
    },
    size: 250,
    enableHiding: false,
  },
  {
    header: 'Role',
    accessorKey: 'role',
    cell: ({ row }) => {
      const role = row.original.role
      const roleLabel = getRoleLabel(role)

      return (
        <div className="flex items-center h-full">
          <Badge
            variant="outline"
            className={cn(
              'gap-1 py-0.5 px-2 text-sm',
              role === 'admin' &&
                'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
              role === 'member' && 'text-muted-foreground',
            )}
          >
            {role === 'admin' && (
              <RiShieldLine
                className="text-blue-600 dark:text-blue-400"
                size={14}
                aria-hidden="true"
              />
            )}
            {role === 'member' && (
              <RiUserLine
                className="text-muted-foreground"
                size={14}
                aria-hidden="true"
              />
            )}
            {roleLabel}
          </Badge>
        </div>
      )
    },
    size: 120,
  },
  {
    header: 'Sent',
    accessorKey: 'createdAt',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        <TimeAgo date={row.original.createdAt} />
      </span>
    ),
    size: 120,
  },
  {
    header: 'Status',
    accessorKey: 'computedStatus',
    cell: ({ row }) => {
      const invitation = row.original
      const isExpired = invitation.isExpired

      return (
        <div className="flex items-center h-full">
          <Badge
            variant="outline"
            className={cn(
              'gap-1 py-0.5 px-2 text-sm',
              isExpired
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300'
                : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300',
            )}
          >
            <RiTimeLine
              className={cn(
                'size-3',
                isExpired
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400',
              )}
              aria-hidden="true"
            />
            {isExpired ? 'Expired' : 'Pending'}
          </Badge>
        </div>
      )
    },
    size: 120,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <InvitationRowActions invitation={row.original} />,
    size: 60,
    enableHiding: false,
  },
]

function MemberRowActions({ member }: { member: Member }) {
  const { org, orgSlug } = useOrg()
  const [isLoading, setIsLoading] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const utils = api.useUtils()

  const handleRemoveMember = async () => {
    try {
      setIsLoading(true)
      await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: org!.id,
      })
      void utils.organization.getMembers.invalidate({ orgSlug })
      setShowRemoveDialog(false)
      toast.success('Member removed successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show actions for owners
  if (member.role === 'owner') {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="shadow-none text-muted-foreground/60"
              aria-label="Member actions"
            >
              <RiMoreLine className="size-5" size={20} aria-hidden="true" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto">
          <DropdownMenuItem
            onClick={() => setShowRemoveDialog(true)}
            variant="destructive"
            className="dark:data-[variant=destructive]:focus:bg-destructive/10"
          >
            <RiDeleteBin6Line className="size-4" />
            Remove Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
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
                <span className="font-medium">
                  {member.user.name || member.user.email}
                </span>{' '}
                from the organization.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isLoading}
              className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
            >
              {isLoading ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function InvitationRowActions({ invitation }: { invitation: Invitation }) {
  const { orgSlug } = useOrg()
  const [isLoading, setIsLoading] = useState(false)

  const utils = api.useUtils()

  const extendInvitationMutation =
    api.organization.extendInvitation.useMutation({
      onSuccess: () => {
        void utils.organization.listInvitations.invalidate({ orgSlug })
        toast.success('Invitation extended successfully')
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })

  const handleCancelInvitation = async () => {
    try {
      setIsLoading(true)
      await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      })
      void utils.organization.listInvitations.invalidate({ orgSlug })
      toast.success('Invitation cancelled successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel invitation'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExtendInvitation = () => {
    extendInvitationMutation.mutate({
      orgSlug,
      invitationId: invitation.id,
      extensionDays: 7,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none text-muted-foreground/60"
            aria-label="Invitation actions"
          >
            <RiMoreLine className="size-5" size={20} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {invitation.isExpired && (
          <>
            <DropdownMenuItem
              onClick={handleExtendInvitation}
              disabled={extendInvitationMutation.isPending}
            >
              <RiRefreshLine className="size-4" />
              Extend Invitation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onClick={handleCancelInvitation}
          variant="destructive"
          className="dark:data-[variant=destructive]:focus:bg-destructive/10"
          disabled={isLoading}
        >
          <RiDeleteBin6Line className="size-4" />
          Cancel Invitation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function InviteMemberDialog({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { org, orgSlug } = useOrg()

  const form = useForm<z.infer<typeof inviteMemberFormSchema>>({
    resolver: zodResolver(inviteMemberFormSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  })

  const utils = api.useUtils()

  const onSubmit = async (values: z.infer<typeof inviteMemberFormSchema>) => {
    try {
      setIsLoading(true)
      await authClient.organization.inviteMember({
        email: values.email,
        role: values.role as Role,
        organizationId: org!.id,
      })
      void utils.organization.listInvitations.invalidate({ orgSlug })
      setIsOpen(false)
      form.reset()
      toast.success('Invitation sent successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <div className="flex flex-col gap-2">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border">
            <RiUser2Line className="opacity-80" size={16} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">Invite Member</DialogTitle>
            <DialogDescription className="text-left">
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter email address"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send Invitation
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const MembersTable = () => {
  const { orgSlug } = useOrg()

  const { data: members = [], isLoading: isMembersLoading } =
    api.organization.getMembers.useQuery({
      orgSlug,
    })

  const membersColumns = useMemo(() => getMembersColumns(), [])

  const roleFilterOptions = useMemo(
    () => [
      { value: 'owner', label: getRoleLabel('owner') },
      { value: 'admin', label: getRoleLabel('admin') },
      { value: 'member', label: getRoleLabel('member') },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <OrganizationSettingsHeader
        title="Members"
        description="Manage your organization members and their roles."
        action={
          <InviteMemberDialog>
            <Button icon={RiUserAddLine}>Invite Member</Button>
          </InviteMemberDialog>
        }
      />

      <FancyTable
        data={members}
        columns={membersColumns}
        isLoading={isMembersLoading}
        searchConfig={{
          column: 'user.name',
          placeholder: 'Search members...',
        }}
        filterConfig={{
          column: 'role',
          options: roleFilterOptions,
          title: 'Role',
        }}
        defaultSorting={[
          {
            id: 'user.name',
            desc: false,
          },
        ]}
        emptyState={{
          icon: <RiUser2Line size={48} className="text-muted-foreground/40" />,
          title: 'No members found',
          description: 'Invite members to collaborate on your organization.',
        }}
      />
    </div>
  )
}

export const InvitationsTable = () => {
  const { orgSlug } = useOrg()

  const { data: invitations = [], isLoading: isInvitationsLoading } =
    api.organization.listInvitations.useQuery({
      orgSlug,
    })

  const invitationsColumns = useMemo(() => getInvitationsColumns(), [])

  return (
    <div className="space-y-6">
      <OrganizationSettingsHeader
        title="Pending Invitations"
        description="Manage pending invitations to your organization."
      />

      <FancyTable
        data={invitations}
        columns={invitationsColumns}
        isLoading={isInvitationsLoading}
        searchConfig={{
          column: 'email',
          placeholder: 'Search invitations...',
        }}
        defaultSorting={[
          {
            id: 'createdAt',
            desc: true,
          },
        ]}
        emptyState={{
          icon: <RiMailLine size={48} className="text-muted-foreground/40" />,
          title: 'No pending invitations',
          description: 'All invitations have been accepted or expired.',
        }}
      />
    </div>
  )
}

export const OrganizationMembers = () => {
  return (
    <div className="space-y-8">
      <MembersTable />
      <InvitationsTable />
    </div>
  )
}
