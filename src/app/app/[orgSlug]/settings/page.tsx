import { Metadata } from 'next'
import GeneralSettingsPage from './general-settings-page'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return <GeneralSettingsPage />
}
