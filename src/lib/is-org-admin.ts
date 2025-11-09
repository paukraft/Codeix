import { Member } from 'better-auth/plugins'

export const adminRoles = ['admin', 'owner']

export const isOrgAdmin = (member: Pick<Member, 'role'>) => {
  return { isAdmin: adminRoles.includes(member.role) }
}
