import { appConfig } from '@/app-config'
import { redirect } from 'next/navigation'

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  redirect(appConfig.getBaseOrgPath(orgSlug) + '/chat')
}
