# Armador de Horarios Inteligente · UPAO 📅

[![CI](https://github.com/alessandrorr1007-debug/armador-horarios/actions/workflows/ci.yml/badge.svg)](https://github.com/alessandrorr1007-debug/armador-horarios/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-10b981.svg)](./manifest.webmanifest)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1%20AA-6366f1.svg)](#accesibilidad)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Optimizador profesional de horarios universitarios para estudiantes de la **Universidad Privada Antenor Orrego (UPAO)**. Convierte el texto desestructurado del portal de matrícula en combinaciones óptimas de horarios sin cruces de clase, respetando ligas de teoría, práctica y laboratorio, límites de créditos y restricciones laborales.

---

## 🌟 Características Principales

- **⚡ Cero Cruces de Horario:** Algoritmo combinatorio de backtracking multivariable en 2 fases (troncales obligatorias + electivas por créditos).
- **🔗 Soporte Nativo de Ligas UPAO:** Asocia automáticamente los grupos amarrados de Teoría (T), Práctica (P) y Laboratorio (L).
- **💼 Modo Optimización Laboral:** Evita clases en horarios laborales (por defecto, sábados antes de las 15:30) y compacta al máximo los huecos libres.
- **🛡️ Persistencia Automática:** Guarda el estado en `localStorage` con versionado de esquema, aviso de restauración de sesión y opción de importar/exportar copias de seguridad en formato `.json`.
- **📱 PWA & Funcionamiento Offline:** Compatible con Service Worker (`sw.js`) y `manifest.webmanifest` para instalarse en móviles/escritorio sin requerir conexión a internet.
- **📥 Exportación Múltiple:**
  - **PNG de alta resolución (2x)** con `html2canvas` cargado de forma perezosa (lazy).
  - **Calendario (.ics RFC 5545)** con zona horaria `America/Lima` y recurrencia semanal para Google Calendar, Apple Calendar y Outlook.
  - **Impresión / PDF** limpio mediante hoja de estilos `@media print`.
  - **Copiar lista de NRCs** con un clic para facilitar la matrícula en el portal.
- **♿ Accesibilidad WCAG 2.1 AA:** Navegación completa por teclado, contraste verificado en tema oscuro y claro, avisos `aria-live`, etiquetas semánticas y enlace "Saltar al contenido".
- **📱 Vista Dual:** Cuadrícula semanal por bloques institucionales UPAO (o bloques estándar de 1 hora) y Vista de Agenda Diaria para pantallas móviles.

---

## 🚀 Inicio Rápido

La aplicación es un sitio estático puro (Vanilla HTML5/CSS3/ES Modules) que **no requiere ningún proceso de compilación** para ejecutarse en el navegador.

### Opción 1: Servir localmente con cualquier servidor HTTP

```bash
# Con npx serve
npx serve .

# O con Python
python -m http.server 8080

# O con Node http-server
npx http-server -p 3000
```

Abre tu navegador en `http://localhost:3000`.

---

## 📋 ¿Cómo copiar el texto de cursos desde el portal UPAO?

1. Ingresa a tu **Portal Académico UPAO** o sistema de matrícula Banner.
2. Abre la consulta de horarios / oferta académica de tu carrera o ciclo.
3. Selecciona con el cursor la tabla de cursos completa, incluyendo el nombre del curso, NRC, sección, cupos, días, horas, aula y docente.
4. Presiona `Ctrl + C` (o `Cmd + C`).
5. En el **Paso 1** de la aplicación, pega el contenido en el área de texto (`Ctrl + V`) y presiona el botón **"Procesar y Agregar Curso"** (o usa el atajo `Ctrl + Enter`).
6. En el **Paso 2**, verifica las secciones, marca cursos como **Obligatorio** si lo deseas y define tu límite de créditos.
7. Haz clic en **"Generar Horario Optimizado"** para ver las combinaciones resultantes en el **Paso 3**.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Alt + 1` | Ir al Paso 1: Cargar Cursos |
| `Alt + 2` | Ir al Paso 2: Verificar Cupos y Límite |
| `Alt + 3` | Ir al Paso 3: Horario Optimizado |
| `Ctrl + Enter` | Procesar texto en el área de entrada del Paso 1 |
| `Escape` | Cerrar diálogos modales o notificaciones Toast |

---

## 🧪 Pruebas Automatizadas y Calidad de Código

El proyecto utiliza el **test runner nativo de Node.js** (`node --test`), garantizando pruebas rápidas y sin dependencias pesadas:

```bash
# Ejecutar la suite de pruebas unitarias (parser, solver, metrics, storage, utils)
npm test

# Ejecutar el linter (ESLint)
npm run lint

# Verificar formateo de código (Prettier)
npm run format

# Aplicar correcciones automáticas de formato
npm run format:fix
```

### Estructura de Pruebas (`tests/`)

- `tests/parser.test.js`: Pruebas sobre textos reales UPAO con ligas, múltiples bloques, secciones cerradas, docentes ausentes y entradas malformadas.
- `tests/solver.test.js`: Verificación de resolución sin cruces, respeto de obligatorios, tope de créditos y consistencia de grupos atómicos de ligas.
- `tests/metrics.test.js`: Cálculo de huecos entre clases, días lectivos e índices de compactación.
- `tests/storage.test.js`: Validación de versionado y migraciones de esquema.
- `tests/utils.test.js`: Conversión de minutos, IDs únicos con `crypto.randomUUID()` y sanitización HTML.

---

## 📂 Estructura del Proyecto

```text
armador-horarios/
├── .github/workflows/
│   └── ci.yml                 # Integración Continua (Lint + Tests en push/PR)
├── assets/
│   ├── icons/                 # Favicons SVG, PNG PWA (192, 512) y apple-touch-icon
│   └── social-banner.svg      # Imagen Open Graph y Twitter Card para previsualizaciones
├── css/
│   ├── variables.css          # Tokens, paleta dark/light y contraste WCAG 2.1 AA
│   ├── base.css               # Reset, tipografías base y skip-link
│   ├── components.css         # Botones (>=44px), modales, toasts, tarjetas, formularios
│   ├── grid.css               # Cuadrícula semanal por minutos y vista de agenda móvil
│   └── responsive.css         # Media queries (@media max-width: 768px y @media print)
├── src/
│   ├── config.js              # Presets de cuadrícula (UPAO y 1h), colores, constantes
│   ├── exporter.js            # Exportación PNG diferida, iCalendar (.ics RFC 5545) y print
│   ├── grid.js                # Renderizado seguro de grilla y agenda con accesibilidad
│   ├── main.js                # Punto de entrada de la aplicación y registro de Service Worker
│   ├── metrics.js             # Cálculo de huecos, horas lectivas y eficiencia
│   ├── parser.js              # Parser regex tolerante con diagnósticos detallados
│   ├── solver.js              # Motor combinatorio por backtracking en 2 fases
│   ├── solver.worker.js       # Web Worker para cómputo en segundo plano
│   ├── storage.js             # Persistencia segura en localStorage y backup JSON
│   ├── store.js               # Store reactivo con persistencia automática debounced
│   ├── ui.js                  # Manejo de vistas, eventos, toasts, modales y atajos
│   └── utils.js               # Escape HTML, generador de UUIDs y formateo de hora
├── tests/                     # Suite de pruebas unitarias nativas (node --test)
├── vendor/                    # Librerías locales para soporte offline estricto y CSP
│   ├── html2canvas.min.js     # Captura de canvas para PNG (v1.4.1)
│   └── remixicon/             # Iconografía Remix Icon (v4.2.0)
├── index.html                 # Documento HTML principal con CSP, OG y JSON-LD
├── script.js                  # Puente de exportación retrocompatible
├── styles.css                 # Punto de entrada CSS con @import modular
├── manifest.webmanifest       # Manifiesto de Aplicación Web Progresiva (PWA)
├── sw.js                      # Service Worker con estrategia de caché offline
├── _headers                   # Cabeceras de seguridad HTTP (Cloudflare Pages / Netlify)
├── robots.txt                 # Directivas de indexación para motores de búsqueda
├── sitemap.xml                # Mapa de sitio XML
└── package.json               # Configuración de scripts de desarrollo (sin runtime deps)
```

---

## 🌐 Despliegue en Producción

### GitHub Pages
1. Ve a **Settings** > **Pages** en tu repositorio de GitHub.
2. En **Source**, selecciona `Deploy from a branch`.
3. Elige la rama `main` (o `mejoras-completas`) y carpeta `/ (root)`.
4. La aplicación funcionará inmediatamente gracias a que todas las rutas internas de assets y módulos son relativas (`./`).

### Cloudflare Pages / Netlify / Vercel
1. Conecta el repositorio de GitHub.
2. Build command: Dejar vacío (o `npm test`).
3. Publish directory: `.` (la raíz del proyecto).
4. El archivo `_headers` aplicará automáticamente la Content Security Policy y cabeceras de protección (HSTS, X-Frame-Options, no-referrer).

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Desarrollado con ❤️ para la comunidad universitaria de la UPAO.
