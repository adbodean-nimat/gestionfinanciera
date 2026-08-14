export function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'

    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(value)
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
    if (value === null || value === undefined) return '-'

    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(value)
}

export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-'

    return new Intl.NumberFormat('es-AR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    }).format(value)
}