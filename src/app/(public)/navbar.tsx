import Logo from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { MobileNav } from '../../components/mobile-nav'
// import Link from 'next/link'

// Sample navigation links, you can replace these with your actual links
// you can add more categories it will be rendered in mobile nav, but only the first one will be rendered in desktop nav
const navigationLinks = [
  {
    name: 'Menu',
    items: [
      { href: '#', label: 'Products', active: true },
      { href: '#', label: 'Pricing' },
      { href: '#', label: 'Docs' },
      { href: '#', label: 'About' },
    ],
  },
]

export default function Navbar() {
  return (
    <header className="container mx-auto flex h-14 items-center justify-between gap-4">
      <div className="flex flex-1 items-center justify-start gap-2">
        <MobileNav nav={navigationLinks} />

        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            "dark:hover:bg-accent text-accent-foreground [&_svg:not([class*='size-'])]:size-6",
          )}
        >
          <Logo />
        </Link>
      </div>

      <NavigationMenu className="max-md:hidden">
        <NavigationMenuList>
          {navigationLinks[0].items.map((link, index) => (
            <NavigationMenuItem key={index}>
              <NavigationMenuLink
                asChild
                href={link.href}
                data-active={link.active}
                className="rounded-md px-3 py-1.5 font-medium"
              >
                <Link href={link.href}>{link.label}</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Link
          href="/sign-in"
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          Sign-in
        </Link>
        <Link href="/app" className={cn(buttonVariants({ size: 'sm' }))}>
          Get Started
        </Link>
      </div>
    </header>
  )
}
