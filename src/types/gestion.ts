export type GestionEstadoCarga =
    | 'sin_fecha'
    | 'sin_sincronizar'
    | 'consultando'
    | 'sincronizando'
    | 'sincronizado'
    | 'modificado'
    | 'guardando'
    | 'guardado'
    | 'error'

export type GestionEstado =
    | 'BORRADOR'
    | 'SINCRONIZADO'
    | 'GUARDADO'
    | 'ERROR'

export interface GestionAutomaticos {
    caja: number | null
    valores: number | null
    fondosFci: number | null
    proveedores: number | null
    otrosOpv: number | null
    proveedoresAVencer: number | null
    cobranzas: number | null
    stockCostoReposicion: number | null
    acopioCierreMes: number | null
    acopioMesActual: number | null
    cuentaCorrienteClientes: number | null
    ventasNetas: number | null
    diasCaja: number | null
}

export interface GestionManuales {
    ajusteCaja: number | null
    bancos: number | null
    bancosDescubierto: number | null
    opvOtros: number | null
    otrosPagosProyectados: number | null
    anticipos: number | null
    acopiosEspeciales: number | null
    acopioCierreMes: number | null
    ajusteProveedoresAVencer: number | null
    observacion: string | null
}

export interface GestionCalculados {
    cajaFinal: number | null
    proveedoresAVencerFinal: number | null
    totalDisponibilidades: number | null
    totalPasivos: number | null
    liquidezNeta: number | null
    compromisosProyectados: number | null
    cobranzasProyectadas: number | null
    diasCaja: number | null
}

export interface GestionRegistro {
    fecha: string
    semana: string
    estado?: GestionEstado | null
    automaticos: GestionAutomaticos
    manuales: GestionManuales
    calculados: GestionCalculados
    sincronizadoEn: string | null
    guardadoEn: string | null
    existeEnPostgres: boolean
}

export function esGestionGuardada(registro: GestionRegistro): boolean {
    return registro.estado === 'GUARDADO'
}

export interface GestionSavePayload {
    fecha: string
    semana: string
    estado: 'GUARDADO'
    sincronizadoEn: string | null
    automaticos: Omit<GestionAutomaticos, 'otrosOpv'>
    manuales: GestionManuales
}

export interface GestionListadoParams {
    desde?: string
    hasta?: string
    estado?: GestionEstado
    limit?: number
    offset?: number
}

export interface GestionPagination {
    limit: number
    offset: number
    total: number
}

export interface GestionSingleResponse {
    ok: boolean
    data: GestionRegistro
}

export interface GestionAutomaticosResponse {
    ok: boolean
    data: GestionAutomaticosApiData
}

export interface GestionAutomaticosApiData extends GestionAutomaticos {
    fecha: string
    semana?: string
    sincronizadoEn: string | null
}

export interface GestionAutomaticosSincronizados {
    fecha: string
    automaticos: GestionAutomaticos
    sincronizadoEn: string | null
}

export function normalizarGestionAutomaticos(
    data: GestionAutomaticosApiData
): GestionAutomaticosSincronizados {
    return {
        fecha: data.fecha,
        automaticos: {
            caja: data.caja,
            valores: data.valores,
            fondosFci: data.fondosFci,
            proveedores: data.proveedores,
            otrosOpv: data.otrosOpv,
            proveedoresAVencer: data.proveedoresAVencer,
            cobranzas: data.cobranzas,
            stockCostoReposicion: data.stockCostoReposicion,
            acopioCierreMes: data.acopioCierreMes,
            acopioMesActual: data.acopioMesActual,
            cuentaCorrienteClientes: data.cuentaCorrienteClientes,
            ventasNetas: data.ventasNetas,
            diasCaja: data.diasCaja,
        },
        sincronizadoEn: data.sincronizadoEn,
    }
}

export interface GestionListadoResponse {
    ok: boolean
    data: GestionRegistro[]
    pagination: GestionPagination
}

export function emptyAutomaticos(): GestionAutomaticos {
    return {
        caja: null,
        valores: null,
        fondosFci: null,
        proveedores: null,
        otrosOpv: null,
        proveedoresAVencer: null,
        cobranzas: null,
        stockCostoReposicion: null,
        acopioCierreMes: null,
        acopioMesActual: null,
        cuentaCorrienteClientes: null,
        ventasNetas: null,
        diasCaja: null,
    }
}

export function emptyManuales(): GestionManuales {
    return {
        ajusteCaja: null,
        bancos: null,
        bancosDescubierto: null,
        opvOtros: null,
        otrosPagosProyectados: null,
        anticipos: null,
        acopiosEspeciales: null,
        acopioCierreMes: null,
        ajusteProveedoresAVencer: null,
        observacion: null,
    }
}

export function resolverCobranzasProyectadas(
    valorBackend: number | null | undefined,
    ventasNetasSemanaAnterior: number | null | undefined
): number | null {
    return (
        valorBackend ??
        ventasNetasSemanaAnterior ??
        null
    )
}

export type ManualMoneyParseResult =
    | { ok: true; value: number | null }
    | { ok: false; reason: 'invalid' | 'negative' }

export function parseManualMoneyInput(
    value: string,
    options: { allowNegative?: boolean } = {}
): ManualMoneyParseResult {
    if (value.trim() === '') {
        return { ok: true, value: null }
    }

    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
        return { ok: false, reason: 'invalid' }
    }

    if (parsed < 0 && !options.allowNegative) {
        return { ok: false, reason: 'negative' }
    }

    return { ok: true, value: parsed }
}

function money(value: number | null): number {
    return value ?? 0
}

function roundAmount(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

function addRequired(values: Array<number | null>): number | null {
    if (values.some((value) => value === null)) return null
    return roundAmount(
        values.reduce<number>((total, value) => total + money(value), 0)
    )
}

export function calcularGestion(
    automaticos: GestionAutomaticos,
    manuales: GestionManuales
): GestionCalculados {
    const cajaFinal = automaticos.caja === null
        ? null
        : roundAmount(automaticos.caja + money(manuales.ajusteCaja))
    const proveedoresAVencerFinal = automaticos.proveedoresAVencer === null
        ? null
        : roundAmount(
              automaticos.proveedoresAVencer +
                  money(manuales.ajusteProveedoresAVencer)
          )

    const disponibilidadesAntesDescubierto = addRequired([
        cajaFinal,
        manuales.bancos,
        automaticos.valores,
        automaticos.fondosFci,
    ])
    const totalDisponibilidades = disponibilidadesAntesDescubierto === null
        ? null
        : roundAmount(
              disponibilidadesAntesDescubierto -
                  money(manuales.bancosDescubierto)
          )

    const totalPasivos = addRequired([
        automaticos.proveedores,
        manuales.opvOtros,
    ])

    const compromisosProyectados =
        proveedoresAVencerFinal === null ||
        manuales.otrosPagosProyectados === null
            ? null
            : roundAmount(
                  proveedoresAVencerFinal + manuales.otrosPagosProyectados
              )

    const diasCajaRequired = [
        automaticos.caja,
        manuales.bancos,
        automaticos.fondosFci,
        automaticos.proveedores,
        manuales.opvOtros,
    ]
    const diasCajaDenominator =
        money(automaticos.proveedores) + money(manuales.opvOtros)
    const diasCaja =
        diasCajaRequired.some((value) => value === null) ||
        diasCajaDenominator === 0
            ? null
            : (money(cajaFinal) +
                  money(manuales.bancos) +
                  money(automaticos.fondosFci)) /
              diasCajaDenominator

    return {
        cajaFinal,
        proveedoresAVencerFinal,
        totalDisponibilidades,
        totalPasivos,
        liquidezNeta:
            totalDisponibilidades === null || totalPasivos === null
                ? null
                : roundAmount(totalDisponibilidades - totalPasivos),
        compromisosProyectados,
        cobranzasProyectadas: null,
        diasCaja,
    }
}
