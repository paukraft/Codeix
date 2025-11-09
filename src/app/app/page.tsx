import { IfLastOrgRedirect } from './if-last-org-redirect'
import OrgPickerPage from './org-picker-page'

export default function AppPage() {
  return (
    <>
      <OrgPickerPage />
      <IfLastOrgRedirect />
    </>
  )
}
