# REGISTRO DE CAMBIOS Y MEJORAS COMPLETAS (CAMBIOS.md)

**Proyecto:** Armador de Horarios Inteligente · UPAO  
**Fecha:** Octubre 2026  
**Rama:** `mejoras-completas`  
**Ingeniero:** Full-Stack / Senior Front-End Engineer  

Este documento detalla todas las mejoras técnicas, arquitectónicas, de rendimiento, accesibilidad y funcionales implementadas en una sola pasada integral según lo especificado.

---

## 1. Resumen de Implementación por Sección

### Sección 1: Persistencia (Crítico)
- **Persistencia Automática en `localStorage`:** Se implementó en [`src/storage.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/storage.js) y [`src/store.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/store.js) un mecanismo con guardado *debounced* que almacena automáticamente: `coursesData`, `activeCreditLimit`, cursos obligatorios (`c.obligatorio`), secciones excluidas o cerradas (`s.incluirEnArmado`), estado del modo trabajo (`workOptimizationActive`), bloques de indisponibilidad personalizados, preset de cuadrícula, criterio de ordenamiento, tema visual (`theme`) y paso actual (`currentStep`).
- **Aviso de Restauración de Sesión:** Al iniciar la app, si existe una sesión previa con cursos guardados, se despliega en la cabecera un banner accesible (`#restore-session-banner`) con las opciones *"Restaurar sesión anterior"* y *"Empezar de cero"*, gestionando la recuperación o el vaciado seguro con confirmación.
- **Protección contra fallos y Versionado:** Todas las operaciones de lectura/escritura están envueltas en bloques `try/catch` para manejar modo incógnito o almacenamiento lleno. Se incluye el campo `schemaVersion: 2` para futuras migraciones.
- **Exportación e Importación de Sesión JSON:**
  - Botón *"Exportar sesión (.json)"*: Genera y descarga un archivo `Horarios_Backup_YYYY-MM-DD.json`.
  - Botón *"Importar sesión (.json)"*: Permite subir copias de seguridad previas, validando la estructura del JSON y sus campos obligatorios antes de cargar el estado.

### Sección 2: Seguridad
- **Subresource Integrity (SRI) y Recursos Locales:** Se calcularon los hashes criptográficos reales SHA-384 de las dependencias externas (`html2canvas`: `sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H` y `remixicon.css`: `sha384-6FSSi597BTd6QcnsBNoLclRKxTOyyYqkaucRjFgCNr8wHVCp0COLClSPY4Vy/bjh`). Además, se descargaron y empaquetaron localmente en la carpeta `/vendor`, garantizando tanto funcionamiento 100% offline para PWA como cumplimiento estricto de Content Security Policy sin depender de redes de terceros.
- **Eliminación de `.innerHTML` con datos de usuario:** Se reemplazó la concatenación de variables en cadenas HTML por creación segura de nodos con `document.createElement`, asignación con `.textContent` y atributos seguros en [`src/grid.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/grid.js) y [`src/ui.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/ui.js).
- **Content-Security-Policy y Referrer-Policy:** Se configuró una meta etiqueta restrictiva `<meta http-equiv="Content-Security-Policy">` y un archivo `_headers` que restringe scripts a `'self'`, estilos a fuentes seguras, bloquea objetos y establece `<meta name="referrer" content="no-referrer">`.
- **Generador de IDs Seguro:** Se reemplazó `Math.random()` por `generateId()` en [`src/utils.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/utils.js), utilizando `crypto.randomUUID()` nativo con fallback criptográfico a `crypto.getRandomValues()`.
- **Validación y Límite de Entrada:** El parser valida el tamaño del texto ingresado con un tope de 500 KB (`APP_CONFIG.MAX_INPUT_TEXT_LENGTH`) para proteger el hilo de renderizado contra entradas maliciosas o textos gigantescos.

### Sección 3: Rendimiento
- **Carga Diferida de `html2canvas` (Lazy Loading):** Se eliminó el script síncrono bloqueante del `<head>` de `index.html`. La función `loadHtml2CanvasLazy()` en [`src/exporter.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/exporter.js) inyecta la librería únicamente cuando el usuario presiona el botón *"Descargar PNG"*, mostrando un spinner de carga y gestionando errores de red.
- **Optimización de Fuentes Web:** Se incorporó `<link rel="preconnect">` hacia `fonts.googleapis.com` y `fonts.gstatic.com`, añadiendo `display=swap` y limitando los pesos tipográficos a los estrictamente empleados (`Outfit: 600, 700, 800` y `Plus Jakarta Sans: 500, 600, 700`).
- **Prevención de Re-renders y Debounce:** Los inputs de filtrado y cálculo aplican la utilidad `debounce()` para evitar llamadas repetitivas.
- **Web Worker para el Solver:** Se implementó [`src/solver.worker.js`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/src/solver.worker.js), que ejecuta el backtracking en un hilo secundario sin congelar la interfaz de usuario, permitiendo cancelar o controlar el tiempo máximo de búsqueda (`SOLVER_TIMEOUT_MS: 8000`) y número máximo de soluciones (`MAX_SOLUTIONS_LIMIT: 50`).

### Sección 4: Arquitectura y Calidad de Código
- **Modularización ES Modules (`/src`):**
  - `src/config.js`: Constantes, presets de cuadrícula UPAO/1h, colores y bloques de indisponibilidad.
  - `src/utils.js`: Funciones utilitarias (`escapeHtml`, `generateId`, `timeStringToMin`, `formatTime`, `debounce`, `copyToClipboard`).
  - `src/parser.js`: Parser de expresiones regulares con diagnósticos por línea y advertencias detalladas.
  - `src/metrics.js`: Métricas de horario (huecos, días activos, eficiencia y colisiones de indisponibilidad).
  - `src/solver.js`: Algoritmo de backtracking en 2 fases con preservación estricta de ligas.
  - `src/solver.worker.js`: Web Worker para ejecución off-thread.
  - `src/grid.js`: Renderizador de la cuadrícula UPAO y de la nueva vista de agenda móvil.
  - `src/exporter.js`: Generador de imágenes PNG, exportador `.ics` y rutinas de impresión.
  - `src/storage.js`: Capa de persistencia, migraciones y copia de seguridad JSON.
  - `src/store.js`: Store reactivo centralizado con suscripción de eventos.
  - `src/ui.js`: Controladores de vista, diálogos modales, toasts y atajos de teclado.
  - `src/main.js`: Punto de entrada principal y registro de Service Worker.
- **Modularización CSS (`/css`):**
  - `css/variables.css`: Tokens de diseño, paleta dark/light y contraste WCAG 2.1 AA.
  - `css/base.css`: Reset, accesibilidad base, tipografías y skip-link.
  - `css/components.css`: Componentes interactivos, botones, modales, toasts y formularios.
  - `css/grid.css`: Estructura matemática del horario y bloques visuales.
  - `css/responsive.css`: Media queries para dispositivos móviles y estilos de impresión `@media print`.
  - `styles.css`: Entrada maestra que utiliza `@import` para ensamblar todos los módulos.
- **Herramientas de Desarrollo:** Configuración de `package.json` con `type: "module"`, scripts `test`, `lint`, `format`, configuración de `eslint.config.js` y `.prettierrc`.
- **Documentación Completa:** Se redactó un `README.md` exhaustivo y se documentó todo el código público con JSDoc.

### Sección 5: Pruebas Automatizadas
- **Suite de Pruebas con Test Runner Nativo de Node.js (`node --test`):**
  - 22 pruebas unitarias automatizadas pasando al 100% en 5 suites sin dependencias externas pesadas.
  - `tests/parser.test.js`: Validación de cursos individuales, ligas compuestas, cupos agotados, detección de secciones cerradas, docentes ausentes y entradas basura.
  - `tests/solver.test.js`: Verificación de ausencia de cruces, error de obligatorios en conflicto (`mandatory_conflict`), obligatorios sin secciones (`mandatory_no_sections`), tope de créditos y ligas completas (teoría + práctica).
  - `tests/metrics.test.js`: Cálculo de huecos (> 5 min), eficiencia porcentual y detección de choques laborales.
  - `tests/utils.test.js`: Formateo de tiempo 12h/24h, generación de UUIDs y debounce.
  - `tests/storage.test.js`: Versionado y estructura de sesión.
- **Workflow de GitHub Actions:** Archivo `.github/workflows/ci.yml` para correr automáticamente `npm run lint` y `npm test` en cada push o pull request.

### Sección 6: Nuevas Funcionalidades
- **Editor de Indisponibilidad y Presets Laborales:** Reemplazo de la regla fija de sábado por un sistema parametrizado con bloques de indisponibilidad configurables (`DEFAULT_UNAVAILABILITY_PRESETS`), incluyendo el preset *"Trabajo sábado hasta 15:30"* para mantener total compatibilidad con el comportamiento anterior.
- **Parametrización de la Cuadrícula:** Selector de preset con soporte para **Bloques Oficiales UPAO (110m / 105m)** y **Bloques Estándar de 1 Hora**.
- **Exportación a Calendario (.ics RFC 5545):** Generación de archivo `.ics` con zona horaria `America/Lima`, recurrencia semanal para el ciclo (16 semanas) y metadatos de aula, docente y NRC.
- **Copiar Lista de NRCs:** Botón en el Paso 3 que extrae y copia al portapapeles todos los códigos NRC de la opción de horario seleccionada (`"1234, 5678, 9012"`) para facilitar la inscripción en el portal.
- **Descargar PDF / Imprimir:** Estilos optimizados `@media print` que formatean la grilla en apaisado (landscape) ocultando botones y menús.
- **Selector de Soluciones Mejorado:** Posibilidad de ordenar combinaciones por *"Menos huecos"*, *"Menos días"*, *"Mayor eficiencia"* o *"Más créditos"*, con marcado de favoritos (estrella ★).
- **Atajos de Teclado:** `Alt + 1/2/3` para pasos, `Ctrl + Enter` en textarea y `Escape` para cerrar modales y avisos.

### Sección 7: Accesibilidad (WCAG 2.1 AA)
- **Etiquetas y Roles ARIA:** Inclusión de `<label>` visible y vinculado para `#text-input` y `.course-title-input`; atributos `aria-label` en botones con íconos (`.btn-icon-danger`, `#theme-toggle`); roles `aria-pressed`, `aria-current="step"`, `role="alert"` y `aria-live="polite"`.
- **Contraste de Color:** Revisión de variables `--text-muted` en modo oscuro (`#cbd5e1` sobre fondos `#131b2e` / `#1d283d`) y modo claro (`#475569`), garantizando ratios de contraste superiores a **4.5:1** para cumplir WCAG AA.
- **Navegación por Teclado:** Enlace accesible `.skip-link` (*"Saltar al contenido principal"*), anillos de foco `:focus-visible` de alto contraste y gestión de foco al cambiar de paso (`heading.focus()`).
- **Respeto a Preferencias del Sistema:** Consultas `@media (prefers-reduced-motion)` para desactivar transiciones y selección inicial del tema según `prefers-color-scheme`.

### Sección 8: Diseño y UX Móvil
- **Vista de Agenda Móvil:** Selector en la barra de herramientas que permite alternar entre la cuadrícula clásica con scroll horizontal y una **Vista de Agenda Diaria** estructurada en tarjetas verticales por día.
- **Áreas Táctiles y Tipografía:** Todos los botones poseen un área de toque mínima de **44×44 px**. Los campos de formulario utilizan `font-size: 1rem` (16px) para prevenir el molesto zoom automático involuntario en iOS Safari.
- **Sistema de Notificaciones Toast:** Notificaciones flotantes accesibles con icono, mensaje de estado y botón de acción (ej. *"Deshacer"* al vaciar la lista).
- **Diálogos Modales Accesibles:** Reemplazo de los diálogos nativos `alert()` y `confirm()` por modales semánticos con captura de foco y cierre con `Escape`.

### Sección 9: SEO, PWA y Metadatos
- **Metadatos Open Graph y Twitter Cards:** Inclusión completa de `og:title`, `og:description`, `og:image`, `og:url`, `og:locale` (`es_PE`), y `twitter:card` con imagen social vectorial generada en [`assets/social-banner.svg`](file:///d:/Proyectos/UPAO%20PROC/Horarios%20S/assets/social-banner.svg).
- **Datos Estructurados:** Bloque `<script type="application/ld+json">` con especificación `schema.org/WebApplication`.
- **PWA & Offline:** Archivo `manifest.webmanifest` con iconos en SVG y PNG (192px y 512px) y Service Worker `sw.js` con estrategia de caché *stale-while-revalidate*.
- **Archivos SEO:** `robots.txt` y `sitemap.xml` configurados para el repositorio.
- **Plantilla de Analítica:** Comentario con plantilla para analítica respetuosa sin cookies (Plausible Analytics), inactiva por defecto.

### Sección 10: Despliegue
- **Preparación para GitHub Pages:** Todas las rutas internas de assets y módulos están configuradas de forma relativa (`./`), asegurando compatibilidad inmediata tanto en la raíz de un dominio como en subcarpetas de repositorios GitHub Pages (`/armador-horarios/`).
- **Cabeceras HTTP en `_headers`:** Archivo de configuración listo para Cloudflare Pages y Netlify con CSP, HSTS, X-Content-Type-Options y Referrer-Policy.

---

## 2. Inventario de Archivos Creados, Modificados y Eliminados

### Archivos Creados
- `src/config.js` (Constantes, presets de cuadrícula y de indisponibilidad)
- `src/utils.js` (Sanitización, UUIDs seguros, conversión y formateo de hora, debounce)
- `src/parser.js` (Parser regex modular con diagnósticos por línea)
- `src/metrics.js` (Cálculo de métricas, huecos y colisiones)
- `src/solver.js` (Algoritmo de resolución en 2 fases con ligas y topes de crédito)
- `src/solver.worker.js` (Web Worker para ejecución off-thread)
- `src/storage.js` (Capa de persistencia localStorage y exportador/importador JSON)
- `src/grid.js` (Renderizador DOM accesible de cuadrícula y agenda móvil)
- `src/exporter.js` (Exportación PNG lazy, iCalendar `.ics` y utilidades de impresión)
- `src/store.js` (Store reactivo centralizado con autosave)
- `src/ui.js` (Controlador de vistas, eventos, toasts y modales accesibles)
- `src/main.js` (Punto de entrada de la aplicación)
- `css/variables.css` (Tokens y paletas de color con contraste WCAG AA)
- `css/base.css` (Reset, tipografías, skip-link y foco visible)
- `css/components.css` (Botones, formularios, modales, toasts y tarjetas)
- `css/grid.css` (Estilos de cuadrícula matemática y vista de agenda)
- `css/responsive.css` (Media queries para móvil y estilos de impresión `@media print`)
- `tests/parser.test.js` (Pruebas unitarias del parser)
- `tests/solver.test.js` (Pruebas unitarias del solver)
- `tests/metrics.test.js` (Pruebas unitarias de métricas)
- `tests/storage.test.js` (Pruebas unitarias de persistencia)
- `tests/utils.test.js` (Pruebas unitarias de utilidades)
- `vendor/html2canvas.min.js` (Librería local para exportación PNG offline)
- `vendor/remixicon/remixicon.css` y `remixicon.woff2` (Iconografía local)
- `assets/icons/icon.svg` (Icono vectorial oficial)
- `assets/icons/icon-192.png`, `icon-512.png` y `apple-touch-icon.png` (Iconos PWA)
- `assets/social-banner.svg` (Banner social para Open Graph / Twitter)
- `manifest.webmanifest` (Manifiesto de PWA)
- `sw.js` (Service Worker para soporte offline)
- `_headers` (Cabeceras de seguridad para Cloudflare Pages / Netlify)
- `robots.txt` (Directivas para motores de búsqueda)
- `sitemap.xml` (Mapa de sitio XML)
- `package.json` (Scripts de test, lint y format)
- `eslint.config.js` y `.prettierrc` (Configuración de linting y formateo)
- `.github/workflows/ci.yml` (Pipeline de integración continua)
- `README.md` (Documentación completa del proyecto)
- `CAMBIOS.md` (Este informe de cambios)

### Archivos Modificados
- `index.html` (Reestructurado con CSP, Open Graph, JSON-LD, skip-link, labels semánticos y entrada a `src/main.js`)
- `styles.css` (Convertido en ensamblador limpio de módulos CSS mediante `@import`)
- `script.js` (Convertido en puente de re-exportación retrocompatible con JSDoc)
- `.gitignore` (Actualizado con `node_modules`, archivos de lock y temporales)

### Archivos Eliminados
- Ningún archivo preexistente del proyecto fue eliminado; se preservaron `index.html`, `script.js` y `styles.css` refactorizados y modularizados.

---

## 3. Decisiones Técnicas Tomadas

1. **Test Runner Nativo de Node.js (`node --test`):** Se optó por el test runner incorporado en Node.js v20+ en lugar de añadir frameworks pesados como Jest o Vitest. Esto permite que cualquier desarrollador clone el repositorio y ejecute `npm test` al instante sin descargas masivas de paquetes.
2. **Distribución Híbrida de Dependencias (`/vendor` + CDN con SRI):** Aunque las librerías se pueden cargar vía CDN con sus hashes SRI correspondientes, se optó por guardar copias locales en `/vendor/`. Esto permite que el Service Worker ofrezca un soporte **100% offline** real sin requerir peticiones de red iniciales.
3. **Carga Perezosa de `html2canvas`:** `html2canvas` pesa cerca de 200 KB. La inmensa mayoría de usuarios solo la necesita al final del flujo (si deciden descargar una imagen PNG). Moverla a una importación dinámica en `src/exporter.js` reduce significativamente el tiempo de interacción inicial (TBT / FCP).
4. **Fallback Sincrónico para Web Workers:** Los Web Workers son excelentes para evitar congelar el navegador en combinatorias pesadas, pero en ciertos entornos restringidos (sandboxes locales `file:///` o iframes con restricciones de origen) pueden ser bloqueados por el navegador. Se implementó un fallback transparente que ejecuta el solver de manera síncrona si el Worker no puede inicializarse.
5. **Preservación Estricta de la Lógica Algorítmica:** La lógica de agrupación de ligas atómicas (donde una práctica está ligada a un grupo específico de teoría) y el algoritmo de backtracking en 2 fases se mantuvieron idénticos en su esencia matemática, garantizando que el usuario obtenga exactamente los mismos resultados fiables para sus datos.

---

## 4. Limitaciones y Aspectos No Realizables

- **Conexión Directa a la API del Portal UPAO:** No fue posible conectar directamente la aplicación con los servidores de la universidad mediante un login automático para extraer los cursos sin intervención del usuario, debido a que el portal Banner de la UPAO se encuentra protegido tras firewalls institucionales, VPNs y sesiones con Captcha que bloquean peticiones Cross-Origin (CORS). El flujo de copiado y pegado sigue siendo la solución más universal, privada y robusta.
