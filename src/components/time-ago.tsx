'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { timeAgo } from '@/lib/timeAgo'
import { useEffect, useState } from 'react'
export const TimeAgo = ({ date }: { date?: Date }) => {
  const [timeAgoState, setTimeAgoState] = useState('')

  useEffect(() => {
    if (!date) return

    setTimeAgoState(timeAgo(date))
    const interval = setInterval(() => {
      setTimeAgoState(timeAgo(date))
    }, 30000)

    return () => clearInterval(interval)
  }, [date])

  if (!date) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>{timeAgoState}</span>
      </TooltipTrigger>
      <TooltipContent>{date.toLocaleString()}</TooltipContent>
    </Tooltip>
  )
}
