import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SeededAvatar } from '@/components/ui/seeded-avatar'
import type { User } from 'better-auth'

export const UserAvatar = ({
  user,
  ...props
}: { user: Pick<User, 'name' | 'email' | 'image'> } & Parameters<
  typeof Avatar
>[0]) => {
  return (
    <Avatar {...props}>
      {user.image && <AvatarImage src={user.image} />}
      <AvatarFallback>
        <SeededAvatar
          seed={user.name || user.email || 'User'}
          variant="character"
        />
      </AvatarFallback>
    </Avatar>
  )
}
