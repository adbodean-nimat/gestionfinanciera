import { gestionMock } from '@/data/gestion.mock'
import { mapLegacyMockRow } from '@/mappers/gestion.mapper'
import {
    calcularGestion,
    emptyAutomaticos,
    emptyManuales,
    type GestionAutomaticos,
    type GestionRegistro,
    type GestionSavePayload,
} from '@/types/gestion'

function wait(ms = 600) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
}

const postgresMock = new Map<string, GestionRegistro>()

function mapMockToAutomaticos(fecha: string): GestionAutomaticos | null {
    const item = gestionMock.find((row) => row.fecha === fecha)

    if (!item) return null

    return mapLegacyMockRow(item).automaticos
}

export async function mockGetGestionRegistro(fecha: string): Promise<GestionRegistro | null> {
    await wait(500)

    const saved = postgresMock.get(fecha)

    return saved ? clone(saved) : null
}

export async function mockGetGestionAutomaticos(fecha: string): Promise<GestionAutomaticos> {
    await wait(900)

    const automaticos = mapMockToAutomaticos(fecha)

    if (!automaticos) {
        throw new Error(
            `No hay datos automáticos simulados para la fecha ${fecha}. En backend real se consultaría GET /gestion/automaticos?fecha=${fecha}.`
        )
    }

    return clone(automaticos)
}

/* export async function getGestionAutomaticos(fecha: string): Promise<GestionAutomaticos> {
    const response = await fetch(`/gestion/automaticos?fecha=${fecha}`)

    if (!response.ok) {
        throw new Error('No se pudieron obtener los datos automáticos desde Plataforma.')
    }

    return response.json()
}

export async function saveGestionRegistro(payload: GestionSavePayload): Promise<GestionRegistro> {
    const response = await fetch('/gestion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'No se pudo guardar el registro.')
    }

    return response.json()
} */

export async function mockSaveGestionRegistro(
    payload: GestionSavePayload,
    options?: { overwrite?: boolean }
): Promise<GestionRegistro> {
    await wait(700)

    const exists = postgresMock.has(payload.fecha)

    if (exists && !options?.overwrite) {
        throw new Error('Ya existe un registro guardado para esa fecha.')
    }

    const automaticos: GestionAutomaticos = {
        ...emptyAutomaticos(),
        ...payload.automaticos,
    }
    const calculados = calcularGestion(automaticos, payload.manuales)

    const saved: GestionRegistro = {
        fecha: payload.fecha,
        semana: payload.semana,
        automaticos: clone(automaticos),
        manuales: clone(payload.manuales),
        calculados,
        sincronizadoEn: payload.sincronizadoEn,
        guardadoEn: new Date().toISOString(),
        existeEnPostgres: true,
    }

    postgresMock.set(payload.fecha, saved)

    return clone(saved)
}

export function buildEmptyRegistro(fecha: string): GestionRegistro {
    const automaticos = mapMockToAutomaticos(fecha) ?? emptyAutomaticos()

    const manuales = emptyManuales()

    return {
        fecha,
        semana: fecha,
        automaticos,
        manuales,
        calculados: calcularGestion(automaticos, manuales),
        sincronizadoEn: null,
        guardadoEn: null,
        existeEnPostgres: false,
    }
}
