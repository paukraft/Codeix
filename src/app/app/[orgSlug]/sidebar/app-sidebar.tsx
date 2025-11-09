'use client'

import * as React from 'react'

import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { NavContent } from './nav-content'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <NavContent />
      <SidebarRail />
    </Sidebar>
  )
}
