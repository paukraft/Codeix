'use client'

import { setLastOrg } from '@/lib/last-org-utils'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export const LastOrgSetter = () => {
  const { orgSlug } = useParams()
  useEffect(() => {
    if (orgSlug) {
      setLastOrg({ orgSlug: orgSlug as string })
    }
  }, [orgSlug])

  return null
}
