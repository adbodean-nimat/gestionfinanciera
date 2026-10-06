export function canDownloadGestionReport(roles: readonly string[]): boolean {
    return roles.some((role) => role === 'ADMIN_GESTION' || role === 'EDITOR_GESTION')
}
