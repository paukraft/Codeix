'use client'

import { appConfig } from '@/app-config'
import { OrganizationCreateDialog } from '@/components/org-creation-dialog'
import { OrganizationLogo } from '@/components/organization-logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'
import { RiAddLine, RiArrowUpDownLine, RiCheckLine } from '@remixicon/react'
import { useParams, useRouter } from 'next/navigation'
import * as React from 'react'

export const TeamSwitcher = () => {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const params = useParams()
  const orgSlug = params.orgSlug as string
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)

  const {
    data: organizations,
    isPending,
    refetch,
  } = authClient.useListOrganizations()

  const currentOrg = organizations?.find((org) => org.slug === orgSlug)

  const handleOrgClick = (newOrgSlug: string) => {
    if (newOrgSlug !== orgSlug) {
      router.push(appConfig.getBaseOrgPath(newOrgSlug))
    }
  }

  const handleCreateSuccess = () => {
    refetch()
    setIsCreateDialogOpen(false)
  }

  if (isPending || !currentOrg) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-16 mt-1" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <OrganizationLogo
                org={currentOrg}
                className="size-8"
                withFancyBorder={true}
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentOrg.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  @{currentOrg.slug}
                </span>
              </div>
              <RiArrowUpDownLine className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {organizations?.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleOrgClick(org.slug)}
                className="gap-2 p-2"
              >
                <OrganizationLogo
                  org={org}
                  className="size-6"
                  withFancyBorder={false}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{org.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{org.slug}
                  </div>
                </div>
                {org.slug === orgSlug && (
                  <RiCheckLine className="size-4 text-sidebar-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <OrganizationCreateDialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={handleCreateSuccess}
              trigger={
                <DropdownMenuItem
                  className="gap-2 p-2"
                  onSelect={(e) => {
                    e.preventDefault()
                    setIsCreateDialogOpen(true)
                  }}
                >
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                    <RiAddLine className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    Add team
                  </div>
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
