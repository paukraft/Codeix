'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { appConfig } from '@/app-config'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useOrg } from '@/hooks/use-org'
import { api } from '@/trpc/react'
import { RiAddLine, RiMessage2Line } from '@remixicon/react'

export const SessionNav = () => {
  const { orgSlug } = useOrg()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const baseUrl = appConfig.getBaseOrgPath(orgSlug)

  const { data: sessions = [] } = api.agentSession.list.useQuery({ orgSlug })

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="uppercase text-muted-foreground/65">
        Sessions
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="group/menu-button group-data-[collapsible=icon]:px-[5px]! font-medium gap-3 h-9 [&>svg]:size-auto"
              tooltip="New Session"
              isActive={pathname === `${baseUrl}/chat`}
            >
              <Link href={`${baseUrl}/chat`} onClick={handleNavClick}>
                <RiAddLine size={22} aria-hidden="true" />
                <span>New Session</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {sessions.map((session) => {
            const href = `${baseUrl}/chat/${session.id}`
            const isActive = pathname.startsWith(href)
            const label =
              session.repository?.name
                ? session.repository.name
                : `Session ${session.id.slice(0, 6)}`

            return (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  asChild
                  className="group/menu-button group-data-[collapsible=icon]:px-[5px]! gap-3 h-9 [&>svg]:size-auto"
                  tooltip={label}
                  isActive={isActive}
                >
                  <Link href={href} onClick={handleNavClick}>
                    <RiMessage2Line size={22} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}


