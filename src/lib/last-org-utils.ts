const lastOrgLocalStorageKey = 'lastOrg'

export const getLastOrg = () => {
  const lastOrg = localStorage.getItem(lastOrgLocalStorageKey)

  return lastOrg
}

export const setLastOrg = ({ orgSlug }: { orgSlug: string }) => {
  localStorage.setItem(lastOrgLocalStorageKey, orgSlug)
}
