'use client'

import { TimeAgo } from '@/components/time-ago'
import { Skeleton } from '@/components/ui/skeleton-plus'
import { useOrg } from '@/hooks/use-org'
import { OrganizationSettingsHeader } from './header'

export default function GeneralSettingsPage() {
  const { org, orgSlug } = useOrg()

  return (
    <div className="space-y-6">
      <OrganizationSettingsHeader
        title="General Settings"
        description="Basic information about your organization"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between py-4 px-6 bg-muted/30 rounded-lg border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">
                {org ? org.name : <Skeleton />}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {org ? (
                <>
                  Created <TimeAgo date={org.createdAt} />
                </>
              ) : (
                <Skeleton />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
