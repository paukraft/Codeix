import LogoImage from '@/../public/favicon.ico'
import { appConfig } from '@/app-config'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('relative size-10', className)}>
      <Image src={LogoImage} alt={appConfig.appName} fill />
    </div>
  )
}
