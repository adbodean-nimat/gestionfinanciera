# Tablero de Gestión Financiera

Aplicación web para consultar, completar y analizar la información financiera semanal de Prades S.A. Centraliza disponibilidades, pasivos, cobranzas, ventas, stock y otros indicadores para ofrecer una visión rápida de la liquidez actual y proyectada.

## Funcionalidades

- Autenticación con sesión propia de Gestión Financiera y control de acceso por permisos.
- Tablero principal con resumen diario, proyección semanal, tendencias y alertas.
- Sincronización de datos automáticos desde el backend y carga de ajustes manuales.
- Cálculo de disponibilidades, pasivos, liquidez neta, compromisos proyectados y días de caja.
- Consulta de registros históricos por período.
- Configuración de apariencia, con temas claro, oscuro y según el sistema.
- Administración de usuarios, roles y estado de acceso para usuarios autorizados.
- Interfaces alternativas del tablero para comparar presentaciones visuales.

## Pantallas y rutas

| Ruta | Descripción | Permiso requerido |
| --- | --- | --- |
| `/login` | Inicio de sesión con credenciales de Windows. | Público |
| `/tablero-01` | Tablero principal y pantalla inicial de la aplicación. | `gestion.consultar` |
| `/tablero-02` | Versión alternativa del tablero basada en componentes shadcn-vue. | `gestion.consultar` |
| `/gestion-prime` | Versión de desarrollo construida con PrimeVue; en producción redirige al tablero principal. | `gestion.consultar` |
| `/mi-cuenta` | Datos de la cuenta y permisos de la sesión actual. | `gestion.consultar` |
| `/configuracion-general` | Preferencias generales y apariencia de la interfaz. | `gestion.configurar` |
| `/administracion-usuarios` | Alta de usuarios y gestión de roles y estados. | `gestion.administrar_usuarios` |

El permiso `gestion.editar` habilita la sincronización, carga y guardado de información financiera. Las rutas protegidas validan la sesión antes de permitir el acceso.

## Tecnologías principales

- Vue 3 con Composition API y `<script setup>`
- TypeScript
- Vite
- Vue Router
- Tailwind CSS
- shadcn-vue / Reka UI y PrimeVue
- Unovis y Chart.js para visualizaciones
- Axios para comunicación HTTP
- Node.js Test Runner para pruebas automatizadas

## Requisitos

- Node.js compatible con Vite 8
- pnpm (recomendado) o npm
- Acceso a la API de Gestión Financiera

## Configuración

Creá un archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_BASE_URL=https://[IP_ADDRESS]/api
VITE_APP_VERSION=1.0.0
```

Podés partir de `.env.example`. Todas las variables con prefijo `VITE_` se
incorporan al JavaScript que recibe el navegador: no guardes tokens, contraseñas
ni otros secretos en ellas.

| Variable | Descripción |
| --- | --- |
| `VITE_API_BASE_URL` | URL base del backend que expone los servicios de autenticación y gestión. |
| `VITE_APP_VERSION` | Versión mostrada en la pantalla de configuración. Si se omite, se usa `1.0.0`. |

## Instalación y ejecución

```bash
pnpm install
pnpm dev
```

Vite inicia el servidor de desarrollo y lo expone en la red local. La URL exacta se muestra en la terminal.

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `pnpm dev` | Inicia el entorno de desarrollo con recarga automática. |
| `pnpm build` | Valida los tipos y genera la versión optimizada en `dist/`. |
| `pnpm check` | Ejecuta pruebas, validación de tipos y build de producción. |
| `pnpm preview` | Sirve localmente la compilación de producción. |
| `pnpm typecheck` | Ejecuta la validación estática de TypeScript y componentes Vue. |
| `pnpm test` | Ejecuta las pruebas automatizadas del dominio y la interfaz. |

Los mismos scripts pueden ejecutarse con npm, por ejemplo `npm run dev`.

## Integración con el backend

La aplicación consume los siguientes grupos de servicios:

- `/gestion/login` y `/gestion/me`: autenticación y recuperación del perfil, roles y permisos.
- `/gestion/automaticos`: sincronización de valores provenientes de las fuentes financieras.
- `/gestion`: consulta, creación y actualización de registros de gestión.
- `/gestion/admin/usuarios` y `/gestion/admin/roles`: administración de accesos.

El token se conserva en `sessionStorage` y se envía como `Bearer token` únicamente a los servicios de Gestión. Una respuesta `401` limpia la sesión y redirige al inicio de sesión.

## Estructura del proyecto

```text
src/
├── components/gestion/   Componentes específicos del tablero
├── components/ui/        Componentes visuales reutilizables
├── composables/          Estado y lógica reactiva de Gestión
├── data/                 Datos simulados para desarrollo
├── lib/                  Cálculos, alertas, períodos y formatos
├── mappers/              Conversión de respuestas API al modelo de vista
├── router/               Rutas y controles de acceso
├── services/             Autenticación y clientes HTTP
├── types/                Modelos y reglas del dominio
└── views/                Pantallas de la aplicación

tests/                    Pruebas automatizadas
public/                   Recursos estáticos e identidad visual
```

En desarrollo, el tablero puede recurrir a datos simulados si no logra obtener el listado desde la API. Este respaldo no está habilitado en la compilación de producción.

## Preparación para producción

El repositorio usa `pnpm` como gestor canónico. Para obtener una instalación
reproducible y generar el artefacto de publicación:

```bash
pnpm install --frozen-lockfile
pnpm check
```

Publicá el contenido generado en `dist/`. El servidor web debe:

- servir siempre por HTTPS;
- redirigir las rutas de la SPA (por ejemplo `/tablero-01`) a `index.html`;
- enrutar `VITE_API_BASE_URL` al backend y habilitar CORS sólo para el origen real
  de la aplicación si frontend y API usan orígenes distintos;
- aplicar encabezados de seguridad, como CSP, `X-Content-Type-Options`,
  `Referrer-Policy` y `Permissions-Policy`, en la capa de hosting;
- impedir el cacheo de `index.html` y permitir cache prolongado para los archivos
  con hash bajo `assets/`.

Antes de publicar, definí `VITE_API_BASE_URL` y `VITE_APP_VERSION` en el entorno
de build. La autorización debe seguir validándose en el backend; los permisos de
la interfaz sólo controlan la experiencia del usuario.

## Autor

Desarrollado por **Antonio Bodean**.
