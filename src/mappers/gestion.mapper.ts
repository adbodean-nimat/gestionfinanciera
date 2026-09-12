import type { GestionRecord as LegacyGestionRecord } from '@/data/gestion.mock'
export { buildPeriodoEtiqueta } from '@/lib/gestionPeriod'
import { buildPeriodoEtiqueta } from '@/lib/gestionPeriod'
import {
    calcularGestion,
    emptyAutomaticos,
    emptyManuales,
    resolverCobranzasProyectadas,
    type GestionRegistro,
} from '@/types/gestion'

export type GestionDashboard = Pick<GestionRegistro, 'fecha' | 'semana'> &
    GestionRegistro['automaticos'] &
    GestionRegistro['manuales'] &
    GestionRegistro['calculados']

export function mapGestionRegistroToDashboard(
    registro: GestionRegistro
): GestionDashboard {
    const calculadosActuales = calcularGestion(
        registro.automaticos,
        registro.manuales
    )
    const dashboard = {
        fecha: registro.fecha,
        semana: registro.semana,
        ...registro.automaticos,
        ...registro.manuales,
        ...registro.calculados,
    }

    dashboard.semana =
        registro.semana?.trim() || buildPeriodoEtiqueta(registro.fecha)
    dashboard.acopioCierreMes =
        registro.manuales.acopioCierreMes ??
        registro.automaticos.acopioCierreMes
    dashboard.cajaFinal = calculadosActuales.cajaFinal
    dashboard.totalPasivos = calculadosActuales.totalPasivos
    dashboard.liquidezNeta =
        dashboard.totalDisponibilidades === null ||
        dashboard.totalPasivos === null
            ? null
            : dashboard.totalDisponibilidades - dashboard.totalPasivos

    return dashboard
}

export function mapGestionListadoToDashboard(
    registros: GestionRegistro[]
): GestionDashboard[] {
    const dashboard = registros
        .map(mapGestionRegistroToDashboard)
        .sort((left, right) => left.fecha.localeCompare(right.fecha))

    return dashboard.map((actual, index) => ({
        ...actual,
        cobranzasProyectadas: resolverCobranzasProyectadas(
            actual.cobranzasProyectadas,
            dashboard[index - 1]?.ventasNetas
        ),
    }))
}

export function mapLegacyMockRow(row: LegacyGestionRecord): GestionRegistro {
    const automaticos = {
        ...emptyAutomaticos(),
        caja: row.caja,
        valores: row.valores,
        fondosFci: row.fci,
        proveedores: row.proveedores,
        proveedoresAVencer: row.proveedoresAPagarProyectadoSemana,
        cobranzas: row.cobranzas,
        acopioMesActual: row.acopioMesActual,
        ventasNetas: row.ventasNetas,
        diasCaja: row.diasCaja,
    }
    const manuales = {
        ...emptyManuales(),
        bancos: row.bancos,
        bancosDescubierto: row.bancosDescubierto,
        otrosPagosProyectados:
            row.opvOtrosProyectadoSemana ??
            row.impuestosAPagarProyectadoSemana,
        observacion: row.observacionManual ?? null,
    }
    const calculadosLocal = calcularGestion(automaticos, manuales)

    return {
        fecha: row.fecha,
        semana: row.semana,
        automaticos,
        manuales,
        calculados: {
            ...calculadosLocal,
            cajaFinal: row.caja,
            proveedoresAVencerFinal: row.proveedoresAPagarProyectadoSemana,
            totalDisponibilidades: row.totalDisponibilidades,
            totalPasivos: row.totalPasivos,
            liquidezNeta:
                row.totalDisponibilidades === null || row.totalPasivos === null
                    ? null
                    : row.totalDisponibilidades - row.totalPasivos,
            compromisosProyectados:
                row.proveedoresAPagarProyectadoSemana === null &&
                row.opvOtrosProyectadoSemana === null &&
                row.impuestosAPagarProyectadoSemana === null
                    ? null
                    : (row.proveedoresAPagarProyectadoSemana ?? 0) +
                      (row.opvOtrosProyectadoSemana ??
                          row.impuestosAPagarProyectadoSemana ??
                          0),
            cobranzasProyectadas: row.cobranzasProyectadas,
        },
        sincronizadoEn: row.fechaSincronizacionPlataforma ?? null,
        guardadoEn: null,
        existeEnPostgres: false,
    }
}
