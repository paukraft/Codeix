import { AppLayout } from '@/components/app-layout'
import { SettingsTabs } from './settings-tabs'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppLayout header={{ title: 'Settings' }}>
      <SettingsTabs>{children}</SettingsTabs>
    </AppLayout>
  )
}

export default Layout
