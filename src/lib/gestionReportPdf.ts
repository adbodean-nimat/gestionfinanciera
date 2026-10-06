import { jsPDF } from 'jspdf'

export interface ReportIndicator {
    title: string
    value: string
    description: string
    comparison?: { text: string; tone: 'positive' | 'negative' | 'neutral' } | null
}

export interface ReportChart {
    title: string
    labels: string[]
    series: { label: string; color: string; values: (number | null)[] }[]
    stacked?: boolean
    unit: 'ARS' | 'días'
}

export interface GestionReport {
    fecha: string
    semana: string
    simulated: boolean
    resumen: ReportIndicator[]
    proyeccion: ReportIndicator[]
    otros: ReportIndicator[]
    charts: ReportChart[]
}

export async function loadGestionLetterhead(url: string): Promise<Uint8Array> {
    const response = await fetch(url)
    if (!response.ok) throw new Error('No se pudo cargar la membretada de NIMAT.')
    return new Uint8Array(await response.arrayBuffer())
}

export function createGestionReportPdf(report: GestionReport, letterhead: Uint8Array): jsPDF {
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 14
    const width = 182
    const image = pdf.getImageProperties(letterhead)
    const letterheadHeight = width * image.height / image.width
    const contentTop = 8 + letterheadHeight + 10
    let y = 0

    function addLetterhead() {
        pdf.addImage(letterhead, 'PNG', margin, 8, width, letterheadHeight, 'nimat-letterhead', 'FAST')
    }

    function addPage() {
        pdf.addPage()
        addLetterhead()
        y = contentTop
    }

    function text(value: string, x: number, top: number, size = 10, bold = false, color = '#172033') {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal')
        pdf.setFontSize(size)
        pdf.setTextColor(color)
        pdf.text(value.replace(/\u00a0/g, ' '), x, top)
    }

    function header(title: string) {
        addLetterhead()
        text('GESTIÓN FINANCIERA', margin, contentTop, 10, true, '#2563eb')
        text(title, margin, contentTop + 11, 19, true)
        text(`Fecha: ${report.fecha}  |  Semana: ${report.semana}`, margin, contentTop + 19, 10)
        if (report.simulated) text('DATOS SIMULADOS', margin, contentTop + 26, 9, false, '#526075')
        y = contentTop + (report.simulated ? 37 : 30)
    }

    function ensureSpace(height: number) {
        if (y + height <= 276) return
        addPage()
    }

    function indicators(title: string, items: ReportIndicator[]) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        const sectionHeight = 11 + items.reduce((height, item) => height + 12.5 + pdf.splitTextToSize(item.description, 110).length * 3.5, 0)
        ensureSpace(Math.min(sectionHeight, 222))
        text(title, margin, y, 13, true)
        y += 5
        for (const item of items) {
            pdf.setFontSize(8)
            const description = pdf.splitTextToSize(item.description, 110) as string[]
            const rowHeight = 12.5 + description.length * 3.5
            ensureSpace(rowHeight)
            pdf.setFillColor('#f4f7fb')
            pdf.roundedRect(margin, y, width, rowHeight - 2, 1.5, 1.5, 'F')
            text(item.title, margin + 3, y + 5, 9, true)
            description.forEach((line, index) => text(line, margin + 3, y + 9 + index * 3.5, 8, false, '#526075'))
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(12)
            pdf.setTextColor('#172033')
            pdf.text(item.value.replace(/\u00a0/g, ' '), margin + width - 3, y + 6, { align: 'right' })
            if (item.comparison) {
                const color = item.comparison.tone === 'positive' ? '#15803d' : item.comparison.tone === 'negative' ? '#b91c1c' : '#526075'
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(7)
                pdf.setTextColor(color)
                pdf.text(`${item.comparison.text} vs sem. anterior`.replace(/\u00a0/g, ' '), margin + width - 3, y + 11, { align: 'right' })
            }
            y += rowHeight
        }
        y += 6
    }

    header('Reporte de gestión')
    indicators('Resumen del día', report.resumen)
    indicators('Proyección semanal', report.proyeccion)
    indicators('Otros datos', report.otros)

    report.charts.forEach((chart, chartIndex) => {
        if (chartIndex % 2 === 0) {
            addPage()
        }
        const top = contentTop + (chartIndex % 2 === 0 ? 0 : 109)
        text(chart.title, margin, top, 12, true)
        let legendX = margin
        chart.series.forEach((series) => {
            pdf.setFillColor(series.color)
            pdf.rect(legendX, top + 4, 3, 2, 'F')
            text(series.label, legendX + 5, top + 6, 8)
            pdf.setFontSize(8)
            legendX += pdf.getTextWidth(series.label) + 12
        })

        const left = margin + 28
        const plotTop = top + 14
        const plotWidth = width - 30
        const plotHeight = 68
        const finite = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value)
        const values = chart.series.flatMap((series) => series.values.filter(finite))
        const extrema = [...values]
        if (chart.stacked) {
            chart.labels.forEach((_, index) => {
                const present = chart.series.map((series) => series.values[index]).filter(finite)
                extrema.push(present.reduce((sum, value) => sum + Math.max(0, value), 0))
                extrema.push(present.reduce((sum, value) => sum + Math.min(0, value), 0))
            })
        }
        const min = Math.min(0, ...extrema)
        const max = Math.max(0, ...extrema)
        const span = max - min || 1
        const toY = (value: number) => plotTop + plotHeight - ((value - min) / span) * plotHeight
        const toX = (index: number) => left + (chart.stacked ? (index + 0.5) / chart.labels.length : chart.labels.length === 1 ? 0.5 : index / (chart.labels.length - 1)) * plotWidth
        for (let tick = 0; tick <= 4; tick++) {
            const value = min + (span * tick) / 4
            const tickY = toY(value)
            pdf.setDrawColor('#dce3ed')
            pdf.setLineWidth(0.2)
            pdf.line(left, tickY, left + plotWidth, tickY)
            const label = chart.unit === 'ARS'
                ? new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
                : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value)
            text(label, margin, tickY + 1, 8, false, '#526075')
        }
        text(chart.unit, margin, plotTop - 2, 7, false, '#526075')
        const labelStep = Math.max(1, Math.ceil(chart.labels.length / 6))
        chart.labels.forEach((label, index) => {
            if (index % labelStep !== 0 && index !== chart.labels.length - 1) return
            if (index === chart.labels.length - 1 && index % labelStep !== 0 && index % labelStep < labelStep / 2) return
            pdf.setFontSize(7)
            pdf.setTextColor('#526075')
            const compactLabel = label.replace(/(\d{2}\/\d{2})\/\d{4}/g, '$1')
            const lines = pdf.splitTextToSize(compactLabel, plotWidth / 6) as string[]
            pdf.text(lines, toX(index), plotTop + plotHeight + 5, { align: 'center' })
        })

        if (chart.stacked) {
            chart.labels.forEach((_, index) => {
                let positive = 0
                let negative = 0
                chart.series.forEach((series) => {
                    const value = series.values[index]
                    if (!finite(value)) return
                    const base = value >= 0 ? positive : negative
                    const end = base + value
                    const barWidth = Math.min(9, plotWidth / chart.labels.length * 0.7)
                    pdf.setFillColor(series.color)
                    if (value !== 0) pdf.rect(toX(index) - barWidth / 2, Math.min(toY(base), toY(end)), barWidth, Math.abs(toY(end) - toY(base)), 'F')
                    if (value >= 0) positive = end
                    else negative = end
                })
            })
        } else {
            chart.series.forEach((series) => {
                pdf.setDrawColor(series.color)
                pdf.setFillColor(series.color)
                pdf.setLineWidth(0.6)
                series.values.forEach((value, index) => {
                    if (!finite(value)) return
                    const prior = series.values[index - 1]
                    // Un dato ausente interrumpe la línea; no se convierte en cero.
                    if (index > 0 && finite(prior)) pdf.line(toX(index - 1), toY(prior), toX(index), toY(value))
                    pdf.circle(toX(index), toY(value), 0.7, 'F')
                })
            })
        }
        if (!values.length) text('Sin datos disponibles para este período', left + 15, plotTop + 35, 10)
        text('Los datos faltantes se muestran como huecos. Importes en pesos argentinos.', margin, top + 97, 7, false, '#526075')
    })

    const pages = pdf.getNumberOfPages()
    for (let page = 1; page <= pages; page++) {
        pdf.setPage(page)
        text(`Gestión financiera  |  ${report.fecha}`, margin, 288, 8, false, '#526075')
        text(`${page} / ${pages}`, 182, 288, 8, false, '#526075')
    }
    pdf.setProperties({ title: `Reporte de gestión - ${report.fecha}`, subject: report.semana })
    return pdf
}
