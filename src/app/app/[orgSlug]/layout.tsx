import { LastOrgSetter } from '@/components/last-org-setter'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './sidebar/app-sidebar'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <div className="px-4 md:px-6 lg:px-8 py-6 @container">{children}</div>
      </SidebarInset>
      <LastOrgSetter />
    </SidebarProvider>
  )
}

export default Layout
