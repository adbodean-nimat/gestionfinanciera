export type GestionRecord = {
    fecha: string
    semana: string

    caja: number | null
    bancos: number | null
    valores: number | null
    fci: number | null

    totalDisponibilidades: number | null

    proveedores: number | null
    proveedoresAPagarProyectadoSemana: number | null

    impuestosAPagar: number | null
    impuestosAPagarProyectadoSemana: number | null
    opvOtrosProyectadoSemana: number | null

    bancosDescubierto: number | null
    totalPasivos: number | null

    cobranzas: number | null
    cobranzasProyectadas: number | null

    ventasNetas: number | null
    acopioMesActual: number | null
    diasCaja: number | null

    observacionManual?: string | null
    fechaSincronizacionPlataforma?: string | null
}

export const gestionMock: GestionRecord[] = [
    {
        fecha: '2025-07-18',
        semana: '18/07 a 24/07',

        caja: 16060000,
        bancos: 17000000,
        valores: 104325367.52,
        fci: 0,

        totalDisponibilidades: 137385367.52,

        proveedores: 38072336.43,
        proveedoresAPagarProyectadoSemana: 122517616.45,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 38072336.43,

        cobranzas: 234162814.42,
        cobranzasProyectadas: null,

        ventasNetas: 193522987.12,
        acopioMesActual: 11253897.9,
        diasCaja: 0.87,
    },
    {
        fecha: '2025-07-25',
        semana: '25/07 a 31/07',

        caja: 15500000,
        bancos: 45000000,
        valores: 112276532.38,
        fci: 0,

        totalDisponibilidades: 172776532.38,

        proveedores: 41425345.25,
        proveedoresAPagarProyectadoSemana: 375114998.09,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 41425345.25,

        cobranzas: 184704009.38,
        cobranzasProyectadas: 193522987.12,

        ventasNetas: 152647941.64,
        acopioMesActual: 8140717.16,
        diasCaja: 1.46,
    },
    {
        fecha: '2025-08-01',
        semana: '01/08 a 07/08',

        caja: 4700000,
        bancos: 44000000,
        valores: 125504315.63,
        fci: 0,

        totalDisponibilidades: 174204315.63,

        proveedores: 77282568.16,
        proveedoresAPagarProyectadoSemana: 263669912.57,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 77282568.16,

        cobranzas: 220313983.36,
        cobranzasProyectadas: 152647941.64,

        ventasNetas: 182077672.2,
        acopioMesActual: 3256487.14,
        diasCaja: 0.63,
    },
    {
        fecha: '2025-08-08',
        semana: '08/08 a 14/08',

        caja: 18376959,
        bancos: 36000000,
        valores: 150138003.36,
        fci: 0,

        totalDisponibilidades: 204514962.36,

        proveedores: 32911419.03,
        proveedoresAPagarProyectadoSemana: 280804699.19,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 32911419.03,

        cobranzas: 178246856.4,
        cobranzasProyectadas: 182077672.2,

        ventasNetas: 147311451.57,
        acopioMesActual: -7399597.6,
        diasCaja: 1.65,
    },
    {
        fecha: '2025-08-15',
        semana: '15/08 a 21/08',

        caja: 3707040,
        bancos: 20000000,
        valores: 110652094.9,
        fci: 0,

        totalDisponibilidades: 134359134.9,

        proveedores: 5418340.78,
        proveedoresAPagarProyectadoSemana: 223483879.06,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 5418340.78,

        cobranzas: 231164499.53,
        cobranzasProyectadas: 147311451.57,

        ventasNetas: 191045040.93,
        acopioMesActual: 306057.19,
        diasCaja: 4.38,
    },
    {
        fecha: '2025-08-22',
        semana: '22/08 a 28/08',

        caja: 15383136.44,
        bancos: 39825000,
        valores: 105024006.48,
        fci: 0,

        totalDisponibilidades: 160232142.92,

        proveedores: 46431516.67,
        proveedoresAPagarProyectadoSemana: 157849514.97,

        impuestosAPagar: null,
        impuestosAPagarProyectadoSemana: 0,
        opvOtrosProyectadoSemana: null,

        bancosDescubierto: null,
        totalPasivos: 46431516.67,

        cobranzas: 142813484.16,
        cobranzasProyectadas: 191045040.93,

        ventasNetas: 118027672.86,
        acopioMesActual: -5819755.87,
        diasCaja: 1.19,
    },
]
