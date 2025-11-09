'use client'

import * as React from 'react'

import { appConfig } from '@/app-config'
import {
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useOrg } from '@/hooks/use-org'
import { RiSettings3Line } from '@remixicon/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NavUser } from './nav-user'
import { SessionNav } from './session-nav'

const data: {
  navFooter: {
    title: string
    url: string
    icon: React.ElementType
    isActiveOnlyWhenExact?: boolean
    isExternal?: boolean
  }[]
} = {
  navFooter: [
    {
      title: 'Settings',
      url: '/settings',
      icon: RiSettings3Line,
    },
  ],
}

export function NavContent() {
  const { orgSlug } = useOrg()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const baseUrl = appConfig.getBaseOrgPath(orgSlug)

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <>
      <SidebarContent className="">
        <SessionNav />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {data.navFooter.map((item) => {
            const pathNameSlashCount = pathname.split('/').length
            const itemUrl = item.isExternal ? item.url : baseUrl + item.url
            const itemUrlSlashCount = itemUrl.split('/').length

            const isActive = item.isExternal
              ? false
              : (item.isActiveOnlyWhenExact
                  ? pathNameSlashCount === itemUrlSlashCount
                  : true) && pathname.startsWith(itemUrl)

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className="group/menu-button group-data-[collapsible=icon]:px-[5px]! font-medium gap-3 h-9 [&>svg]:size-auto"
                  tooltip={item.title}
                  isActive={isActive}
                >
                  <Link
                    href={itemUrl}
                    onClick={handleNavClick}
                    {...(item.isExternal && {
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    })}
                  >
                    {item.icon && (
                      <item.icon
                        className="text-muted-foreground/65 group-data-[active=true]/menu-button:text-primary"
                        size={22}
                        aria-hidden="true"
                      />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </>
  )
}
