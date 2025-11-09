'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import { SidebarTrigger } from './ui/sidebar'

export const MobileSidebarTrigger = () => {
  const isMobile = useIsMobile()
  if (!isMobile) return null
  return <SidebarTrigger />
}
