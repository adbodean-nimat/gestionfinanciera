import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createGestionReportPdf } from '../src/lib/gestionReportPdf.ts'
import { canDownloadGestionReport } from '../src/lib/gestionReportAccess.ts'

const letterhead = new Uint8Array(readFileSync(new URL('../public/membretada-2025.png', import.meta.url)))

test('solo administrador y editor pueden descargar el reporte', () => {
    assert.equal(canDownloadGestionReport(['ADMIN_GESTION']), true)
    assert.equal(canDownloadGestionReport(['EDITOR_GESTION']), true)
    assert.equal(canDownloadGestionReport(['LECTOR_GESTION']), false)
    assert.equal(canDownloadGestionReport([]), false)
    assert.equal(canDownloadGestionReport(['gestion.editar', 'OTRO_ROL']), false)
})

const indicator = (title) => ({ title, value: '$ 1.234.567', description: 'Valor actual', comparison: { text: '+5%', tone: 'positive' } })
const chart = (title, stacked = false) => ({
    title, stacked, unit: 'ARS',
    labels: ['01/10/2026 a 07/10/2026', '08/10/2026 a 14/10/2026', '15/10/2026 a 21/10/2026'],
    series: [
        { label: 'Disponibilidades', color: '#2563eb', values: [100, null, 300] },
        { label: 'Pasivos', color: '#dc2626', values: [-50, 0, 150] },
    ],
})

test('genera un PDF con todas las secciones y gráficos incluso con huecos y negativos', () => {
    const pdf = createGestionReportPdf({
        fecha: '05/10/2026', semana: '05/10/2026 a 11/10/2026', simulated: true,
        resumen: ['Disponibilidades', 'Total pasivos', 'Días de caja', 'Caja', 'Bancos', 'Valores', 'Fondos', 'Proveedores actual', 'Otros pagos / Impuestos actual'].map(indicator),
        proyeccion: ['Cobranzas promedio', 'Proveedores a vencer', 'Otros pagos proyectados', 'Ventas netas', 'CMV por día'].map(indicator),
        otros: Array.from({ length: 7 }, (_, index) => indicator(`Otro indicador ${index}`)),
        charts: [chart('Disponibilidades y Pasivos'), chart('Caja, Bancos, Valores y Fondos', true), chart('Cobranzas y Obligaciones proyectadas'), { ...chart('Días de stock'), unit: 'días' }],
    }, letterhead)
    const output = pdf.output()
    assert.ok(output.startsWith('%PDF-'))
    for (const label of ['Resumen del día', 'Proyección semanal', 'Otros datos', 'CMV por día', 'Días de caja', 'Caja', 'Bancos', 'Valores', 'Fondos', 'Proveedores actual', 'Otros pagos / Impuestos actual', 'Otro indicador 6', 'Disponibilidades y Pasivos', 'Cobranzas y Obligaciones proyectadas', 'Días de stock', 'DATOS SIMULADOS']) {
        assert.ok(output.includes(label), `Falta ${label}`)
    }
    assert.ok(!output.includes('Desglose del resumen'))
    assert.ok(!output.includes('continuación'))
    assert.ok(!output.includes('Período seleccionado:'))
    assert.equal(output.split('(GESTIÓN FINANCIERA)').length - 1, 1)
    assert.equal(output.split('(Reporte de gestión)').length - 1, 1)
    assert.equal(output.split('(Fecha:').length - 1, 1)
    assert.equal(pdf.getNumberOfPages(), 4)
    assert.equal((output.match(/\/I\d+ Do/g) ?? []).length, pdf.getNumberOfPages(), 'La membretada aparece en cada página')
})

test('los gráficos sin valores no producen coordenadas inválidas', () => {
    const pdf = createGestionReportPdf({
        fecha: '05/10/2026', semana: 'Semana 1', simulated: false,
        resumen: [], proyeccion: [], otros: [],
        charts: [{ ...chart('Sin proyecciones'), labels: ['05/10'], series: [{ label: 'Cobranzas', color: '#16a34a', values: [null] }] }],
    }, letterhead)
    const output = pdf.output()
    assert.ok(output.includes('Sin datos disponibles para este período'))
    assert.ok(!output.includes('NaN'))
    assert.ok(!output.includes('Infinity'))
})
