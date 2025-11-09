import { cn } from '@/lib/utils'
import { SeededAvatar } from './ui/seeded-avatar'

export const OrganizationLogo = ({
  org,
  className = 'size-4',
  withFancyBorder = false,
}: {
  org?: {
    name: string
    logo?: string | null
  }
  className?: string
  withFancyBorder?: boolean
}) => {
  if (!org) return null

  const inner = org.logo ? (
    <img src={org.logo} alt={org.name} className={`${className} rounded-md`} />
  ) : (
    <SeededAvatar seed={org.name} className={cn(className, 'rounded-md')} />
  )

  if (withFancyBorder) {
    return (
      <div
        className={cn(
          'flex aspect-square size-9 items-center justify-center rounded-md overflow-hidden text-sidebar-primary-foreground relative after:rounded-[inherit] after:absolute after:inset-0 after:shadow-[0_1px_2px_0_rgb(0_0_0/.05),inset_0_1px_0_0_rgb(255_255_255/.12)] after:pointer-events-none',
          className,
        )}
      >
        {inner}
      </div>
    )
  }

  return inner
}
