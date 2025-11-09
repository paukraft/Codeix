export const appConfig = {
  appName: 'Codeix',
  baseSignedInPath: '/app',
  getBaseOrgPath: (orgSlug: string) =>
    `${appConfig.baseSignedInPath}/${orgSlug}`,
}
