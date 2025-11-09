'use client'

import { ChevronsUpDown, LogOut } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { UserAvatar } from '@/components/user-avatar'
import { authClient } from '@/lib/auth-client'
import {
  RiCheckLine,
  RiComputerLine,
  RiLink,
  RiMoonLine,
  RiSunLine,
} from '@remixicon/react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { data: session } = authClient.useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  if (!session) {
    return null
  }

  const user = session.user

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar user={user} className="size-8" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar user={user} className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-3 px-1">
                {theme === 'dark' ? (
                  <RiMoonLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                ) : theme === 'light' ? (
                  <RiSunLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                ) : (
                  <RiComputerLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                )}
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => setTheme('light')}
                  className="gap-3 px-1"
                >
                  <RiSunLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <span>Light</span>
                  {theme === 'light' && (
                    <RiCheckLine
                      size={16}
                      className="ml-auto text-primary"
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('dark')}
                  className="gap-3 px-1"
                >
                  <RiMoonLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <span>Dark</span>
                  {theme === 'dark' && (
                    <RiCheckLine
                      size={16}
                      className="ml-auto text-primary"
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className="gap-3 px-1"
                >
                  <RiComputerLine
                    size={18}
                    className="text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <span>System</span>
                  {theme === 'system' && (
                    <RiCheckLine
                      size={16}
                      className="ml-auto text-primary"
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-3 px-1"
              onSelect={() => {
                router.push('/')
              }}
            >
              <RiLink size={18} className="text-muted-foreground/70" />
              <span>Homepage</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => authClient.signOut()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
