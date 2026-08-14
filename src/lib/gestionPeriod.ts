export function buildPeriodoEtiqueta(fecha: string): string {
    const start = new Date(`${fecha}T00:00:00Z`)

    if (Number.isNaN(start.getTime())) return fecha

    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 6)

    const format = (value: Date) =>
        new Intl.DateTimeFormat('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        }).format(value)

    return `${format(start)} a ${format(end)}`
}
