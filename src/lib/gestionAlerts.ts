import { formatCurrency, formatNumber } from '@/lib/formatters'
import type { GestionDashboard } from '@/mappers/gestion.mapper'

export type GestionAlert = {
    title: string
    description: string
    type: 'danger' | 'warning' | 'info'
}

export function buildGestionAlerts(
    current: GestionDashboard | null | undefined
): GestionAlert[] {
    if (!current) return []

    const alerts: GestionAlert[] = []

    if (current.diasCaja !== null && current.diasCaja < 2) {
        alerts.push({
            title: 'Días de caja bajo',
            description: `El último valor disponible es ${formatNumber(current.diasCaja)} días.`,
            type: 'danger',
        })
    }

    if (
        current.compromisosProyectados !== null &&
        current.totalDisponibilidades !== null &&
        current.compromisosProyectados > current.totalDisponibilidades
    ) {
        alerts.push({
            title: 'Compromisos proyectados superan disponibilidades',
            description: `${formatCurrency(current.compromisosProyectados)} contra ${formatCurrency(
                current.totalDisponibilidades
            )} disponibles.`,
            type: 'danger',
        })
    }

    if (
        current.cobranzasProyectadas !== null &&
        current.compromisosProyectados !== null &&
        current.cobranzasProyectadas < current.compromisosProyectados
    ) {
        alerts.push({
            title: 'Cobranzas proyectadas insuficientes',
            description: `${formatCurrency(current.cobranzasProyectadas)} proyectadas contra ${formatCurrency(
                current.compromisosProyectados
            )} a pagar.`,
            type: 'warning',
        })
    }

    if (current.acopioMesActual !== null && current.acopioMesActual < 0) {
        alerts.push({
            title: 'Acopio del mes actual negativo',
            description: `Valor actual: ${formatCurrency(current.acopioMesActual)}.`,
            type: 'warning',
        })
    }

    if (current.bancosDescubierto !== null && current.bancosDescubierto > 0) {
        alerts.push({
            title: 'Uso de bancos descubierto',
            description: `Valor actual: ${formatCurrency(current.bancosDescubierto)}.`,
            type: 'warning',
        })
    }

    return alerts
}
