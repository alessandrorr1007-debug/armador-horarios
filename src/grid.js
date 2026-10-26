/**
 * @fileoverview Renderizado seguro y accesible de la cuadrícula de horarios y vista de agenda móvil.
 */

import { DAYS, COURSE_COLORS, GRID_PRESETS } from './config.js';
import { formatTime } from './utils.js';
import { showClassDetailModal } from './ui.js';

/**
 * Renderiza la cuadrícula semanal basada en el preset seleccionado.
 * @param {HTMLElement} gridElement - Elemento contenedor (#timetable-grid).
 * @param {Object} currentSolution - Solución activa que contiene `selection`.
 * @param {Array<Object>} coursesData - Lista de cursos para asociar colores.
 * @param {string} [presetId='upao'] - ID del preset ('upao' o 'hourly').
 */
export function renderTimetableGrid(gridElement, currentSolution, coursesData, presetId = 'upao') {
  if (!gridElement || !currentSolution) return;

  gridElement.innerHTML = '';
  gridElement.setAttribute('role', 'grid');
  gridElement.setAttribute('aria-label', 'Calendario semanal de clases');

  const preset = GRID_PRESETS[presetId] || GRID_PRESETS.upao;
  const BASE_MIN = preset.baseMin;
  const MAX_MIN = preset.maxMin;
  const TOTAL_MIN = MAX_MIN - BASE_MIN;
  const PX_PER_MIN = preset.pxPerMin;
  const totalHeightPx = TOTAL_MIN * PX_PER_MIN;

  // Mapa de colores refinados por código de curso
  const courseColorMap = {};
  coursesData.forEach((c, idx) => {
    courseColorMap[c.codigo] = COURSE_COLORS[idx % COURSE_COLORS.length];
  });

  const selection = currentSolution.selection || [];
  const hasSunday = selection.some((item) =>
    (item.slots || []).some((slot) => slot.day === 6)
  );

  const activeDaysList = hasSunday ? DAYS : DAYS.slice(0, 6);
  const numDays = activeDaysList.length;

  gridElement.style.gridTemplateColumns = `85px repeat(${numDays}, minmax(130px, 1fr))`;

  // 1. Esquina superior "Hora"
  const cornerCell = document.createElement('div');
  cornerCell.className = 'time-header-cell';
  cornerCell.setAttribute('role', 'columnheader');
  cornerCell.textContent = 'Hora';
  gridElement.appendChild(cornerCell);

  // 2. Encabezados de días
  activeDaysList.forEach((dayName) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header-cell';
    dayHeader.setAttribute('role', 'columnheader');
    dayHeader.textContent = dayName;
    gridElement.appendChild(dayHeader);
  });

  // 3. Columna izquierda con etiquetas horarias
  const timeCol = document.createElement('div');
  timeCol.className = 'time-labels-column';
  timeCol.setAttribute('role', 'rowheader');
  timeCol.style.position = 'relative';
  timeCol.style.height = `${totalHeightPx}px`;

  preset.rows.forEach((row) => {
    const topPx = (row.startMin - BASE_MIN) * PX_PER_MIN;
    const heightPx = row.durationMin * PX_PER_MIN;

    const rowLabel = document.createElement('div');
    rowLabel.className = 'time-fixed-row';
    rowLabel.style.top = `${topPx}px`;
    rowLabel.style.height = `${heightPx}px`;
    rowLabel.textContent = row.label;
    timeCol.appendChild(rowLabel);
  });
  gridElement.appendChild(timeCol);

  // 4. Columnas de Días y bloques de clase interactivos
  for (let d = 0; d < numDays; d++) {
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column-body';
    dayCol.setAttribute('role', 'gridcell');
    dayCol.setAttribute('aria-label', activeDaysList[d]);
    dayCol.style.position = 'relative';
    dayCol.style.height = `${totalHeightPx}px`;

    // Líneas divisorias horizontales
    preset.rows.forEach((row) => {
      const topPx = (row.startMin - BASE_MIN) * PX_PER_MIN;
      const line = document.createElement('div');
      line.className = 'time-slot-line';
      line.style.position = 'absolute';
      line.style.top = `${topPx}px`;
      line.style.left = '0';
      line.style.right = '0';
      line.style.borderTop = '1px solid var(--border-color)';
      dayCol.appendChild(line);
    });

    // Eventos del día d
    selection.forEach((item) => {
      (item.slots || []).forEach((slot) => {
        if (slot.day === d) {
          const topPx = Math.max(0, (slot.startMin - BASE_MIN) * PX_PER_MIN);
          const durationMin = Math.max(15, slot.endMin - slot.startMin);
          const heightPx = durationMin * PX_PER_MIN;

          const colorInfo = courseColorMap[item.courseId] || {
            bg: '#232c45',
            border: '#42537f',
            text: '#f1f5f9'
          };

          const eventBlock = document.createElement('div');
          eventBlock.className = 'event-block';
          eventBlock.style.backgroundColor = colorInfo.bg;
          eventBlock.style.borderLeftColor = colorInfo.border || colorInfo.bg;
          eventBlock.style.color = colorInfo.text;
          eventBlock.style.top = `${topPx}px`;
          eventBlock.style.height = `${Math.max(24, heightPx - 1)}px`;
          eventBlock.tabIndex = 0; // Foco accesible

          const timeLabel = `${formatTime(slot.startMin)} - ${formatTime(slot.endMin)}`;
          const aulaText = slot.aula || 'Aula N/A';
          eventBlock.setAttribute(
            'aria-label',
            `${item.courseName}, ${item.sectionCode}, ${activeDaysList[d]} de ${timeLabel}, ${aulaText}, Docente: ${item.professor}. Clic para ver detalles.`
          );
          eventBlock.title = 'Haz clic para ver todos los detalles de esta clase';

          // Micro-interacción: Clic o Enter abre el modal con detalles de la clase
          eventBlock.addEventListener('click', () => {
            showClassDetailModal(item, slot, activeDaysList[d]);
          });
          eventBlock.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              showClassDetailModal(item, slot, activeDaysList[d]);
            }
          });

          // Estructura DOM segura sin innerHTML
          const titleSpan = document.createElement('span');
          titleSpan.className = 'event-title';
          titleSpan.textContent = item.courseName;

          const secSpan = document.createElement('span');
          secSpan.className = 'event-section';
          secSpan.textContent = `${item.sectionCode} · ${aulaText}`;

          const timeSpan = document.createElement('span');
          timeSpan.className = 'event-time';
          timeSpan.textContent = timeLabel;

          eventBlock.appendChild(titleSpan);
          eventBlock.appendChild(secSpan);
          eventBlock.appendChild(timeSpan);

          dayCol.appendChild(eventBlock);
        }
      });
    });

    gridElement.appendChild(dayCol);
  }
}

/**
 * Renderiza la vista de agenda por día (ideal para dispositivos móviles).
 * @param {HTMLElement} containerElement - Contenedor donde renderizar la agenda.
 * @param {Object} currentSolution - Solución activa.
 * @param {Array<Object>} coursesData - Cursos para colores.
 */
export function renderAgendaView(containerElement, currentSolution, coursesData) {
  if (!containerElement || !currentSolution) return;

  containerElement.innerHTML = '';
  containerElement.className = 'agenda-view-container';

  const courseColorMap = {};
  coursesData.forEach((c, idx) => {
    courseColorMap[c.codigo] = COURSE_COLORS[idx % COURSE_COLORS.length];
  });

  const selection = currentSolution.selection || [];

  // Agrupar eventos por día
  const daysEvents = Array.from({ length: 7 }, () => []);

  selection.forEach((item) => {
    (item.slots || []).forEach((slot) => {
      daysEvents[slot.day].push({
        slot,
        course: item,
        color: courseColorMap[item.courseId] || {
          bg: '#232c45',
          border: '#42537f',
          text: '#f1f5f9'
        }
      });
    });
  });

  let totalEventsRendered = 0;

  daysEvents.forEach((events, dayIdx) => {
    if (events.length === 0) return;
    totalEventsRendered += events.length;

    events.sort((a, b) => a.slot.startMin - b.slot.startMin);

    const dayCard = document.createElement('div');
    dayCard.className = 'agenda-day-card';

    const dayHeader = document.createElement('div');
    dayHeader.className = 'agenda-day-header';

    const dayTitle = document.createElement('h3');
    dayTitle.textContent = DAYS[dayIdx];

    const countBadge = document.createElement('span');
    countBadge.className = 'badge-status badge-open badge-sm';
    countBadge.textContent = `${events.length} clase${events.length === 1 ? '' : 's'}`;

    dayHeader.appendChild(dayTitle);
    dayHeader.appendChild(countBadge);
    dayCard.appendChild(dayHeader);

    const list = document.createElement('div');
    list.className = 'agenda-event-list';

    events.forEach(({ slot, course, color }) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'agenda-event-item';
      itemEl.style.borderLeftColor = color.border || color.bg;
      itemEl.tabIndex = 0;
      itemEl.title = 'Haz clic para ver detalles de la clase';

      itemEl.addEventListener('click', () => {
        showClassDetailModal(course, slot, DAYS[dayIdx]);
      });
      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showClassDetailModal(course, slot, DAYS[dayIdx]);
        }
      });

      const timeCol = document.createElement('div');
      timeCol.className = 'agenda-event-time';
      timeCol.textContent = `${formatTime(slot.startMin)} - ${formatTime(slot.endMin)}`;

      const bodyCol = document.createElement('div');
      bodyCol.className = 'agenda-event-body';

      const title = document.createElement('h4');
      title.className = 'agenda-event-title';
      title.textContent = course.courseName;

      const meta = document.createElement('p');
      meta.className = 'agenda-event-meta';
      meta.textContent = `${course.sectionCode} · Aula: ${slot.aula || 'N/A'} · Docente: ${course.professor}`;

      bodyCol.appendChild(title);
      bodyCol.appendChild(meta);

      itemEl.appendChild(timeCol);
      itemEl.appendChild(bodyCol);
      list.appendChild(itemEl);
    });

    dayCard.appendChild(list);
    containerElement.appendChild(dayCard);
  });

  if (totalEventsRendered === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-muted text-center';
    empty.textContent = 'No hay clases registradas en esta opción de horario.';
    containerElement.appendChild(empty);
  }
}
