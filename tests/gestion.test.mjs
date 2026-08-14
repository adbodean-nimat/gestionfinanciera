import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
    calcularGestion,
    emptyAutomaticos,
    emptyManuales,
    normalizarGestionAutomaticos,
    parseManualMoneyInput,
    resolverCobranzasProyectadas,
} from '../src/types/gestion.ts'
import { formatCurrency } from '../src/lib/formatters.ts'

const root = new URL('../', import.meta.url)

async function source(path) {
    return readFile(new URL(path, root), 'utf8')
}

test('el contrato separa automáticos, manuales y calculados nuevos', async () => {
    const typeSource = await source('src/types/gestion.ts')

    assert.match(typeSource, /semana:\s*string/)
    assert.match(typeSource, /ventasNetas:\s*number\s*\|\s*null/)
    assert.match(typeSource, /acopioCierreMes:\s*number\s*\|\s*null/)
    assert.match(typeSource, /diasCaja:\s*number\s*\|\s*null/)
    assert.match(typeSource, /otrosPagosProyectados:\s*number\s*\|\s*null/)
    assert.match(typeSource, /compromisosProyectados:\s*number\s*\|\s*null/)
    assert.match(typeSource, /cobranzasProyectadas:\s*number\s*\|\s*null/)
    assert.doesNotMatch(
        typeSource.match(/export interface GestionManuales \{[\s\S]*?\n\}/)?.[0] ?? '',
        /cobranzasProyectadas/
    )
    assert.equal(emptyManuales().otrosPagosProyectados, null)
    assert.equal(emptyManuales().acopioCierreMes, null)
})

test('el mapper principal aplana el registro mediante spreads', async () => {
    const mapperSource = await source('src/mappers/gestion.mapper.ts')

    assert.match(
        mapperSource,
        /fecha:\s*registro\.fecha,[\s\S]*semana:\s*registro\.semana,[\s\S]*\.\.\.registro\.automaticos,[\s\S]*\.\.\.registro\.manuales,[\s\S]*\.\.\.registro\.calculados/
    )
    assert.match(mapperSource, /function mapLegacyMockRow/)
})

test('la semana comienza en la fecha elegida y termina seis días después con año', async () => {
    const { buildPeriodoEtiqueta } = await import('../src/lib/gestionPeriod.ts')

    assert.equal(
        buildPeriodoEtiqueta('2026-07-03'),
        '03/07/2026 a 09/07/2026'
    )
    assert.equal(
        buildPeriodoEtiqueta('2026-12-29'),
        '29/12/2026 a 04/01/2027'
    )
})

test('alertas no convierten null a cero y usan compromisos calculados', async () => {
    const alerts = await source('src/lib/gestionAlerts.ts')

    assert.ok(alerts)
    assert.doesNotMatch(alerts, /\?\?\s*0/)
    assert.match(alerts, /current\.compromisosProyectados/)
    assert.match(alerts, /current\.diasCaja !== null/)
})

test('el ícono de alertas usa el estado financiero global fuera del tablero', async () => {
    const layoutSource = await source(
        'src/components/gestion/GestionDashboard01Layout.vue'
    )
    const globalAlertsSource = await source(
        'src/composables/useGestionAlerts.ts'
    )

    assert.match(layoutSource, /props\.alerts \?\? globalAlerts\.value/)
    assert.match(layoutSource, /props\.alerts === undefined[\s\S]*?loadGlobalAlerts\(\)/)
    assert.match(globalAlertsSource, /getGestionListado\(\{ limit: 52, offset: 0 \}\)/)
    assert.match(globalAlertsSource, /buildGestionAlerts\(dashboard\.at\(-1\)\)/)
})

test('los gráficos conservan null y explican los datos faltantes', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')

    assert.match(
        dashboardSource,
        /yTotalPasivos[\s\S]*d\.totalPasivos/
    )
    assert.doesNotMatch(
        dashboardSource.match(
            /const yDisponibilidades[\s\S]*?const calcularCmvPorDia/
        )?.[0] ?? '',
        /\?\?\s*0/
    )
    assert.match(dashboardSource, /datos faltantes se muestran como huecos/i)
})

test('el gráfico de ventas netas no incluye cobranzas ni inventa faltantes', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')
    const salesChart = dashboardSource.match(
        /<CardTitle class="shrink-0">\s*Ventas netas[\s\S]*?<\/Card>/
    )?.[0] ?? ''

    assert.match(dashboardSource, /const hayVentasNetas = computed/)
    assert.match(dashboardSource, /item\.ventasNetas !== null/)
    assert.match(salesChart, /:y="yVentasNetas"/)
    assert.match(salesChart, /:config="ventasNetasChartConfig"/)
    assert.match(salesChart, /No hay ventas netas disponibles/)
    assert.doesNotMatch(salesChart, /Cobranzas/)
    assert.doesNotMatch(dashboardSource, /VisGroupedBar/)
})

test('CMV por día usa una configuración editable y no inventa ventas faltantes', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')
    const configSource = await source(
        'src/components/gestion/GestionCmvConfigDrawer.vue'
    )

    assert.match(dashboardSource, /porcentaje:\s*75\.15/)
    assert.match(dashboardSource, /diasLaborales:\s*5\.5/)
    assert.match(
        dashboardSource,
        /ventasNetas \* \(cmvConfig\.value\.porcentaje \/ 100\)/
    )
    assert.match(dashboardSource, /CMV por día/)
    assert.match(dashboardSource, /window\.localStorage\.setItem/)
    assert.doesNotMatch(dashboardSource, /const yCmvPorDia/)
    assert.doesNotMatch(dashboardSource, /<TableHead>CMV por día<\/TableHead>/)
    assert.match(configSource, /Configuración de CMV/)
    assert.match(configSource, /Guardar configuración/)
})

test('Resumen del día muestra los otros datos y calcula días de stock', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')

    for (const label of [
        'Stock a costo de reposición',
        'Acopio actualizado al cierre del mes',
        'Acopio en el mes actual',
        'Cuenta corriente clientes',
        'Anticipos proveedores',
        'Acopios proveedores',
        'Días de stock',
    ]) {
        assert.match(dashboardSource, new RegExp(label))
    }

    assert.match(
        dashboardSource,
        /current\.stockCostoReposicion\s*\/\s*cmvPorDia/
    )
    assert.match(dashboardSource, /v-for="dato in otrosDatosDelDia"/)
    assert.match(dashboardSource, /:aria-expanded="isOtrosDatosOpen"/)
    assert.match(
        dashboardSource,
        /title:\s*'CMV por día'[\s\S]*?Desglose del resumen[\s\S]*?v-if="isOtrosDatosOpen"/
    )
})

test('Resumen del día conserva el desglose de seis indicadores junto a Días de caja', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')
    const summarySection = dashboardSource.match(
        /<h2[^>]*>Resumen del día<\/h2>[\s\S]*?<\/section>/
    )?.[0] ?? ''

    assert.match(
        summarySection,
        /Días de caja[\s\S]*?Desglose del resumen[\s\S]*?6 indicadores/
    )
    assert.match(summarySection, /:aria-expanded="isResumenDetalleOpen"/)
    assert.match(summarySection, /v-if="isResumenDetalleOpen"/)
    assert.match(summarySection, /Caja[\s\S]*?Bancos[\s\S]*?Valores[\s\S]*?Fondos/)
})

test('el gráfico principal usa cobranzas proyectadas en datos, leyenda y tooltip', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')

    assert.match(
        dashboardSource,
        /Disponibilidades, Pasivos y Cobranzas proyectadas/
    )
    assert.match(dashboardSource, /:y="yDisponibilidades"/)
    assert.match(dashboardSource, /:y="yTotalPasivos"/)
    assert.match(dashboardSource, /:y="yCobranzasProyectadas"/)
    assert.match(
        dashboardSource,
        /const yCobranzasProyectadas = \(d: GestionDashboard\) => d\.cobranzasProyectadas\b/
    )
    assert.doesNotMatch(dashboardSource, /:y="yCompromisosProyectados"/)
    assert.match(
        dashboardSource,
        /const flujoChartConfig = \{[\s\S]*?totalDisponibilidades:\s*\{[\s\S]*?label:\s*'Disponibilidades'/
    )
    assert.doesNotMatch(
        dashboardSource,
        /const flujoChartConfig = \{[\s\S]*?\n\s{4}disponibilidades:\s*\{/
    )
    assert.match(
        dashboardSource,
        /cobranzasProyectadas:\s*\{[\s\S]*?label:\s*'Cobranzas proyectadas'/
    )
    assert.match(dashboardSource, /name:\s*'Cobranzas proyectadas'/)

    const mainChartHeader = dashboardSource.match(
        /Disponibilidades, Pasivos y Cobranzas proyectadas[\s\S]*?<\/CardHeader>/
    )?.[0] ?? ''
    assert.match(dashboardSource, />\s*Tendencias\s*</)
    assert.match(
        dashboardSource,
        /aria-label="Período de análisis"[\s\S]*?v-for="range in \['6', '12', '24', '52'\]"/
    )
    assert.doesNotMatch(
        mainChartHeader,
        /v-for="range in \['6', '12', '24', '52'\]"/
    )
})

test('el Drawer muestra los automáticos y calculados requeridos', async () => {
    const drawerSource = await source('src/components/gestion/GestionDataDrawer.vue')

    for (const field of [
        'automaticos.ventasNetas',
        'automaticos.otrosOpv',
        'calculados.diasCaja',
        'calculados.compromisosProyectados',
        'calculados.cobranzasProyectadas',
        'manuales.otrosPagosProyectados',
    ]) {
        assert.match(drawerSource, new RegExp(field.replace('.', '\\.')))
    }
    assert.match(drawerSource, /sólo lectura/)
    assert.match(drawerSource, /Otros pagos \/ Impuestos/)
    assert.match(drawerSource, /Acopio al cierre del mes/)
    assert.match(drawerSource, /manuales\.acopioCierreMes/)
})

test('el acopio al cierre del mes se carga manualmente y prevalece en el tablero', async () => {
    const composableSource = await source('src/composables/useGestion.ts')
    const mapperSource = await source('src/mappers/gestion.mapper.ts')

    assert.match(
        composableSource,
        /manuales\.acopioCierreMes === null[\s\S]*?manuales\.acopioCierreMes\s*=[\s\S]*?registro\.automaticos\.acopioCierreMes/
    )
    assert.match(
        mapperSource,
        /dashboard\.acopioCierreMes\s*=[\s\S]*?registro\.manuales\.acopioCierreMes\s*\?\?[\s\S]*?registro\.automaticos\.acopioCierreMes/
    )
})

test('sincronizar automáticos no reemplaza el registro completo ni exige manuales', async () => {
    const composableSource = await source('src/composables/useGestion.ts')
    const syncBlock = composableSource.match(
        /async function syncAutomaticos\(\)[\s\S]*?\n    function assertFiniteValues/
    )?.[0] ?? ''
    const drawerSource = await source('src/components/gestion/GestionDataDrawer.vue')
    const typesSource = await source('src/types/gestion.ts')

    assert.ok(syncBlock)
    assert.match(syncBlock, /Object\.assign\(automaticos, registro\.automaticos\)/)
    assert.match(syncBlock, /manuales\.opvOtros = registro\.automaticos\.otrosOpv/)
    assert.match(syncBlock, /registro\.automaticos\.otrosOpv !== null/)
    assert.doesNotMatch(syncBlock, /existingRecord\.value\s*=\s*registro/)
    assert.match(drawerSource, /record\?\.manuales\?\.ajusteCaja/)
    assert.match(typesSource, /data:\s*GestionAutomaticosApiData/)
})

test('normaliza la respuesta plana real de sincronización para el Drawer', () => {
    const responseData = {
        fecha: '2026-07-03',
        semana: '03/07 a 09/07',
        caja: 4715496.92,
        valores: -33319084.1,
        fondosFci: 19240000,
        proveedores: 51001933.12,
        otrosOpv: 8439817.95,
        proveedoresAVencer: 0,
        cobranzas: 348972325.25,
        ventasNetas: 288406880.37,
        stockCostoReposicion: 4405731618.82,
        acopioCierreMes: null,
        acopioMesActual: -917943.43,
        cuentaCorrienteClientes: 178507485.79,
        diasCaja: null,
        sincronizadoEn: '2026-08-07T17:57:52.487Z',
    }

    const result = normalizarGestionAutomaticos(responseData)

    assert.equal(result.fecha, responseData.fecha)
    assert.equal(result.automaticos.caja, 4715496.92)
    assert.equal(result.automaticos.valores, -33319084.1)
    assert.equal(result.automaticos.fondosFci, 19240000)
    assert.equal(result.automaticos.ventasNetas, 288406880.37)
    assert.equal(result.automaticos.otrosOpv, 8439817.95)
    assert.equal(result.automaticos.proveedoresAVencer, 0)
    assert.equal(result.sincronizadoEn, responseData.sincronizadoEn)
})

test('Cancelar limpia por completo los datos y el estado del Drawer', async () => {
    const composableSource = await source('src/composables/useGestion.ts')
    const drawerSource = await source('src/components/gestion/GestionDataDrawer.vue')
    const resetBlock = composableSource.match(
        /function resetDrawer\(\)[\s\S]*?\n    function applyRegistro/
    )?.[0] ?? ''
    const closeBlock = drawerSource.match(
        /function closeDrawer\(\)[\s\S]*?[\r\n]+}[\r\n]+[\r\n]+function enableAjusteCaja/
    )?.[0] ?? ''

    assert.ok(resetBlock)
    assert.match(resetBlock, /selectedDate\.value\s*=\s*''/)
    assert.match(resetBlock, /resetData\(\)/)
    assert.match(resetBlock, /clearErrors\(\)/)
    assert.match(resetBlock, /initialSnapshot\.value\s*=\s*''/)
    assert.match(resetBlock, /steadyStatus\.value\s*=\s*'sin_fecha'/)
    assert.match(closeBlock, /resetDrawer\(\)/)
    assert.match(closeBlock, /showAjusteCaja\.value\s*=\s*false/)
    assert.match(closeBlock, /showAjusteProveedores\.value\s*=\s*false/)
    assert.match(closeBlock, /Object\.keys\(moneyErrors\)/)
    assert.match(
        drawerSource,
        /@click="closeDrawer"[\s\S]*?Cancelar/
    )
})

test('los errores de guardado muestran el mensaje y detalle enviados por backend', async () => {
    const apiSource = await source('src/services/gestion.api.ts')

    assert.match(apiSource, /typeof apiResponse\.message === 'string'/)
    assert.match(apiSource, /apiResponse\.errors/)
    assert.match(apiSource, /details\.join\('\s*·\s*'\)/)
    assert.match(apiSource, /new GestionApiError\(message, status\)/)
})

test('serializa positivo, cero y vacío como number, 0 y null', () => {
    assert.deepEqual(parseManualMoneyInput('12000000'), {
        ok: true,
        value: 12000000,
    })
    assert.deepEqual(parseManualMoneyInput('0'), { ok: true, value: 0 })
    assert.deepEqual(parseManualMoneyInput(''), { ok: true, value: null })
})

test('rechaza negativos, texto inválido e infinitos sin generar NaN', () => {
    assert.deepEqual(parseManualMoneyInput('-1'), {
        ok: false,
        reason: 'negative',
    })
    assert.deepEqual(parseManualMoneyInput('no-es-un-numero'), {
        ok: false,
        reason: 'invalid',
    })
    assert.deepEqual(parseManualMoneyInput('Infinity'), {
        ok: false,
        reason: 'invalid',
    })
})

test('valores proyectados no modifican totalPasivos ni liquidezNeta', () => {
    const automaticos = {
        ...emptyAutomaticos(),
        caja: 100,
        proveedores: 20,
        proveedoresAVencer: 750,
    }
    const base = {
        ...emptyManuales(),
        opvOtros: 5,
        anticipos: 250,
        acopiosEspeciales: 500,
    }
    const withoutProjection = calcularGestion(automaticos, base)
    const withProjection = calcularGestion(automaticos, {
        ...base,
        otrosPagosProyectados: 999999,
    })

    assert.equal(withoutProjection.totalPasivos, 25)
    assert.equal(withProjection.totalPasivos, 25)
    assert.equal(withProjection.compromisosProyectados, 1000749)
    assert.equal(withProjection.liquidezNeta, withoutProjection.liquidezNeta)
})

test('cobranzas proyectadas prioriza backend y luego ventas netas de siete días antes', () => {
    assert.equal(resolverCobranzasProyectadas(150, 100), 150)
    assert.equal(resolverCobranzasProyectadas(0, 100), 0)
    assert.equal(
        resolverCobranzasProyectadas(null, 174125824.26),
        174125824.26
    )
    assert.equal(resolverCobranzasProyectadas(null, null), null)
})

test('Proyección semanal muestra los cinco indicadores solicitados en tarjetas', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')
    const projection = dashboardSource.match(
        /const proyeccionSemanal = computed\(\(\) => \{[\s\S]*?\n\}\)/
    )?.[0] ?? ''

    assert.doesNotMatch(projection, /title:\s*'Cobranzas proyectadas'/)
    assert.match(projection, /title:\s*'Cobranzas promedio'/)
    assert.match(projection, /value:\s*formatCurrency\(current\.cobranzas\)/)
    assert.match(projection, /title:\s*'Ventas netas'/)
    assert.match(projection, /value:\s*formatCurrency\(current\.ventasNetas\)/)
    assert.match(projection, /title:\s*'Proveedores a vencer'/)
    assert.match(projection, /title:\s*'Otros pagos proyectados'/)
    assert.match(projection, /title:\s*'CMV por día'/)
    assert.match(
        projection,
        /title:\s*'Otros pagos proyectados'[\s\S]*?title:\s*'Ventas netas'/
    )
})

test('diasCaja usa caja final, bancos, fondos, proveedores y OPV otros', () => {
    const automaticos = {
        ...emptyAutomaticos(),
        caja: 13000000,
        fondosFci: 48000000,
        proveedores: 33209011.52,
    }
    const manuales = {
        ...emptyManuales(),
        bancos: 34836345.28,
        opvOtros: 8439817.95,
    }

    const calculados = calcularGestion(automaticos, manuales)

    assert.equal(calculados.diasCaja, 2.3010573526209597)
})

test('diasCaja contempla ajusteCaja y es null con datos faltantes o divisor cero', () => {
    const automaticos = {
        ...emptyAutomaticos(),
        caja: 100,
        fondosFci: 50,
        proveedores: 20,
    }
    const manuales = {
        ...emptyManuales(),
        ajusteCaja: -10,
        bancos: 10,
        opvOtros: 5,
    }

    assert.equal(calcularGestion(automaticos, manuales).diasCaja, 6)
    assert.equal(
        calcularGestion(automaticos, { ...manuales, bancos: null }).diasCaja,
        null
    )
    assert.equal(
        calcularGestion(
            { ...automaticos, proveedores: 0 },
            { ...manuales, opvOtros: 0 }
        ).diasCaja,
        null
    )
})

test('los calculados requeridos conservan null igual que el backend', () => {
    const automaticos = {
        ...emptyAutomaticos(),
        caja: 100,
        valores: 20,
        fondosFci: 30,
        proveedores: 40,
        proveedoresAVencer: 50,
    }
    const manuales = {
        ...emptyManuales(),
        bancos: null,
        opvOtros: null,
        otrosPagosProyectados: null,
    }
    const calculados = calcularGestion(automaticos, manuales)

    assert.equal(calculados.cajaFinal, 100)
    assert.equal(calculados.totalDisponibilidades, null)
    assert.equal(calculados.totalPasivos, null)
    assert.equal(calculados.liquidezNeta, null)
    assert.equal(calculados.compromisosProyectados, null)
    assert.equal(
        calcularGestion({ ...automaticos, caja: null }, manuales).cajaFinal,
        null
    )
})

test('el resumen usa una grilla equilibrada y sincroniza cobranzas proyectadas', async () => {
    const drawerSource = await source('src/components/gestion/GestionDataDrawer.vue')
    const composableSource = await source('src/composables/useGestion.ts')

    assert.match(drawerSource, /sm:grid-cols-2 xl:grid-cols-4/)
    assert.match(
        composableSource,
        /fechaAnterior\.setUTCDate\(fechaAnterior\.getUTCDate\(\) - 7\)/
    )
    assert.match(
        composableSource,
        /registroAnterior\?\.automaticos\.ventasNetas \?\? null/
    )
})

test('la UI diferencia cero de null con el formato monetario existente', () => {
    assert.notEqual(formatCurrency(0), formatCurrency(null))
    assert.match(formatCurrency(0), /0/)
    assert.equal(formatCurrency(null), '-')
})

test('Gestión usa una sesión y endpoints de autenticación independientes', async () => {
    const authSource = await source('src/services/auth.ts')
    const httpSource = await source('src/services/http.ts')

    assert.match(authSource, /const TOKEN_KEY = 'gestionToken'/)
    assert.match(authSource, /axios\.post\(apiUrl\('\/gestion\/login'\)/)
    assert.match(authSource, /axios\.get\(apiUrl\('\/gestion\/me'\)/)
    assert.match(authSource, /export const authRoles/)
    assert.match(authSource, /export const authPermissions/)
    assert.match(authSource, /export const authIssuedAt/)
    assert.match(authSource, /export const authExpiresAt/)
    assert.doesNotMatch(authSource, /nimat\.auth\.token/)
    assert.match(httpSource, /requestPath\.startsWith\('\/gestion'\)/)
    assert.match(httpSource, /error\.response\?\.status === 401/)
    assert.doesNotMatch(httpSource, /status === 401 \|\| error\.response\?\.status === 403/)
})

test('la interfaz de Gestión respeta permisos efectivos', async () => {
    const dashboardSource = await source('src/views/GestionDashboardShadcn.vue')
    const layoutSource = await source('src/components/gestion/GestionDashboard01Layout.vue')

    assert.match(dashboardSource, /hasPermission\('gestion\.editar'\)/)
    assert.match(dashboardSource, /hasPermission\('gestion\.configurar'\)/)
    assert.match(layoutSource, /hasPermission\('gestion\.administrar_usuarios'\)/)
    assert.match(layoutSource, /Administración de usuarios/)
})

test('el sidebar clásico no desborda el perfil al estar colapsado', async () => {
    const sidebarSource = await source('src/components/gestion/GestionSidebarLayout.vue')

    assert.match(
        sidebarSource,
        /v-if="!isCollapsed"[\s\S]*?authUser\?\.displayName[\s\S]*?<div v-else class="hidden flex-col items-center gap-2 lg:flex">/
    )
    assert.match(sidebarSource, /class="size-9 rounded-full/)
    assert.match(
        sidebarSource,
        /aria-label="Cerrar sesión"[\s\S]*?<GestionThemeToggle compact \/>/
    )
})

test('el sidebar del tablero 01 inicia contraído', async () => {
    const layoutSource = await source(
        'src/components/gestion/GestionDashboard01Layout.vue'
    )

    assert.match(layoutSource, /const isCollapsed = ref\(true\)/)
})

test('los sidebars desplazan hasta la sección aunque los datos carguen después', async () => {
    const dashboardLayoutSource = await source(
        'src/components/gestion/GestionDashboard01Layout.vue'
    )
    const classicLayoutSource = await source(
        'src/components/gestion/GestionSidebarLayout.vue'
    )
    const navigationSource = await source(
        'src/composables/useGestionSectionNavigation.ts'
    )

    assert.match(dashboardLayoutSource, /useGestionSectionNavigation\(\)/)
    assert.match(classicLayoutSource, /useGestionSectionNavigation\(\)/)
    assert.match(navigationSource, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/)
    assert.match(navigationSource, /attempt < MAX_SCROLL_ATTEMPTS/)
    assert.match(navigationSource, /watch\([\s\S]*?\(\) => route\.hash/)
})

test('el sidebar muestra el copyright y lo conserva como tooltip al contraerse', async () => {
    const layoutSource = await source(
        'src/components/gestion/GestionDashboard01Layout.vue'
    )

    assert.match(layoutSource, /© 2026 TIyC · Prades S\.A\./)
    assert.match(layoutSource, /v-if="!isCollapsed"/)
    assert.match(layoutSource, /v-else class="group relative hidden justify-center lg:flex"/)
    assert.match(layoutSource, /role="tooltip"/)
    assert.match(layoutSource, /group-hover:opacity-100/)
    assert.match(layoutSource, /group-focus-within:opacity-100/)
})

test('el tablero 01 es la pantalla inicial', async () => {
    const routerSource = await source('src/router/index.ts')
    const loginSource = await source('src/views/LoginView.vue')

    assert.match(routerSource, /path:\s*'\/'[\s\S]*?redirect:\s*'\/tablero-01'/)
    assert.doesNotMatch(routerSource, /DashboardSelector/)
    assert.match(
        routerSource,
        /to\.meta\.guestOnly[\s\S]*?return \{ name: 'tablero-01' \}/
    )
    assert.match(loginSource, /:\s*'\/tablero-01'/)
})

test('los accesos de Inicio llevan directamente al tablero 01', async () => {
    const dashboardLayoutSource = await source(
        'src/components/gestion/GestionDashboard01Layout.vue'
    )
    const classicLayoutSource = await source(
        'src/components/gestion/GestionSidebarLayout.vue'
    )

    assert.match(dashboardLayoutSource, /to="\/tablero-01"/)
    assert.doesNotMatch(dashboardLayoutSource, /to="\/"/)
    assert.match(classicLayoutSource, /to="\/tablero-01"/)
    assert.doesNotMatch(classicLayoutSource, /to="\/"/)
})

test('la administración de usuarios está protegida y consume sus endpoints', async () => {
    const routerSource = await source('src/router/index.ts')
    const serviceSource = await source('src/services/usuarios.api.ts')
    const viewSource = await source('src/views/AdministracionUsuariosView.vue')

    assert.match(routerSource, /path:\s*'\/administracion-usuarios'/)
    assert.match(
        routerSource,
        /name:\s*'administracion-usuarios'[\s\S]*?permission:\s*'gestion\.administrar_usuarios'/
    )
    assert.match(serviceSource, /get\('\/gestion\/admin\/usuarios'\)/)
    assert.match(serviceSource, /post\('\/gestion\/admin\/usuarios'/)
    assert.match(serviceSource, /get\('\/gestion\/admin\/roles'\)/)
    assert.match(serviceSource, /\/estado`/)
    assert.match(serviceSource, /\/roles`/)
    assert.match(viewSource, /Administración de usuarios/)
    assert.match(viewSource, /Buscar usuario, correo o rol/)
    assert.match(viewSource, /Editar roles/)
    assert.match(viewSource, /Agregar usuario/)
    assert.match(viewSource, /Usuario de Windows/)
})
