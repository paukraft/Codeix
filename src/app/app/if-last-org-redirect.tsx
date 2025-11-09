'use client'

import { appConfig } from '@/app-config'
import { authClient } from '@/lib/auth-client'
import { getLastOrg } from '@/lib/last-org-utils'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const IfLastOrgRedirect = () => {
  const { data, isPending } = authClient.useSession()
  const router = useRouter()
  const { data: organizations, isPending: isPendingOrganizations } =
    authClient.useListOrganizations()

  useEffect(() => {
    if (!isPending && !isPendingOrganizations) {
      if (!data?.user) {
        router.push('/sign-in')
        return
      }

      const lastOrg = getLastOrg()
      if (lastOrg) {
        const hasAccess = organizations?.some((org) => org.slug === lastOrg)
        if (hasAccess) {
          router.push(appConfig.getBaseOrgPath(lastOrg))
        }
      }
    }
  }, [data?.user, isPending, isPendingOrganizations, organizations, router])

  return null
}
