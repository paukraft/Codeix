'use client'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/sign-in')
    }
  }, [session, isPending, router])

  return <>{children}</>
}
