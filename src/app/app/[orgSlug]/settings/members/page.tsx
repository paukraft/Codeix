import type { Metadata } from 'next'
import { OrganizationMembers } from './organization-members'

export const metadata: Metadata = {
  title: 'Members',
}

export default function MembersPage() {
  return <OrganizationMembers />
}
