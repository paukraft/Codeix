import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type PropsWithChildren, type ReactNode } from 'react'

export const SimpleTooltip = ({
  title,
  children,
}: PropsWithChildren<{ title: ReactNode }>) => {
  if (!title) return <>{children}</>
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent>{title}</TooltipContent>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
      </Tooltip>
    </TooltipProvider>
  )
}
