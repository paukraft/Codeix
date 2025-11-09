'use client'

import { appConfig } from '@/app-config'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrg } from '@/hooks/use-org'
import { RiSettings3Line, RiUserLine } from '@remixicon/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { PropsWithChildren } from 'react'

const settingsNavItems = [
  {
    title: 'General',
    url: '',
    icon: RiSettings3Line,
  },
  {
    title: 'Members',
    url: '/members',
    icon: RiUserLine,
  },
]

export const SettingsTabs = ({ children }: PropsWithChildren) => {
  const { orgSlug } = useOrg()
  const pathname = usePathname()

  const baseUrl = appConfig.getBaseOrgPath(orgSlug)
  const settingsBaseUrl = `${baseUrl}/settings`

  // Determine which tab is currently active based on pathname
  const getCurrentTab = () => {
    if (pathname === settingsBaseUrl) return ''
    const currentPath = pathname.replace(settingsBaseUrl, '')
    return currentPath
  }

  const currentTab = getCurrentTab()

  return (
    <div>
      <Tabs value={currentTab}>
        <div className="w-full overflow-x-auto">
          <TabsList className="w-full min-w-max justify-start md:w-auto">
            {settingsNavItems.map((item) => (
              <TabsTrigger key={item.url} value={item.url} asChild>
                <Link href={`${settingsBaseUrl}${item.url}`}>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <item.icon />
                    {item.title}
                  </div>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <div className="mt-6">{children}</div>
    </div>
  )
}
