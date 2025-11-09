import { authClient } from '@/lib/auth-client'
import { isOrgAdmin } from '@/lib/is-org-admin'
import { api } from '@/trpc/react'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

export const useOrg = () => {
  const params = useParams()
  const orgSlug = params.orgSlug as string
  const { data } = authClient.useSession()

  const isAdmin = useMemo(() => {
    return data?.user.role && isOrgAdmin({ role: data.user.role }).isAdmin
  }, [data?.user?.role])

  const { data: org } = api.organization.getOrganization.useQuery(
    {
      orgSlug,
    },
    {
      enabled: !!orgSlug,
    },
  )

  return { orgSlug, org, isAdmin }
}
