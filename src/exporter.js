/**
 * @fileoverview Exportación de horarios a PNG (vía html2canvas diferido), iCalendar (.ics) e impresión.
 */

import { APP_CONFIG } from './config.js';

let html2canvasLoadedPromise = null;

/**
 * Carga html2canvas de forma perezosa (lazy load) garantizando integridad SRI.
 * @returns {Promise<Function>}
 */
export function loadHtml2CanvasLazy() {
  if (typeof window.html2canvas === 'function') {
    return Promise.resolve(window.html2canvas);
  }

  if (html2canvasLoadedPromise) {
    return html2canvasLoadedPromise;
  }

  html2canvasLoadedPromise = new Promise((resolve, reject) => {
    // 1. Intentar cargar desde /vendor local
    const scriptLocal = document.createElement('script');
    scriptLocal.src = 'vendor/html2canvas.min.js';
    scriptLocal.async = true;

    scriptLocal.onload = () => {
      if (typeof window.html2canvas === 'function') {
        resolve(window.html2canvas);
      } else {
        fallbackToCDN();
      }
    };

    scriptLocal.onerror = () => {
      fallbackToCDN();
    };

    function fallbackToCDN() {
      const scriptCDN = document.createElement('script');
      scriptCDN.src =
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      scriptCDN.integrity =
        'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';
      scriptCDN.crossOrigin = 'anonymous';
      scriptCDN.async = true;

      scriptCDN.onload = () => {
        if (typeof window.html2canvas === 'function') {
          resolve(window.html2canvas);
        } else {
          reject(new Error('No se pudo inicializar html2canvas.'));
        }
      };

      scriptCDN.onerror = () => {
        reject(
          new Error(
            'Error al descargar la librería de exportación gráfica (local y CDN fallaron).'
          )
        );
      };

      document.head.appendChild(scriptCDN);
    }

    document.head.appendChild(scriptLocal);
  });

  return html2canvasLoadedPromise;
}

/**
 * Exporta el contenedor visual del horario como imagen PNG de alta definición.
 * @param {HTMLElement} element - Contenedor DOM a capturar.
 * @param {Object} metadata - Datos adicionales para el nombre de archivo y canvas.
 * @returns {Promise<void>}
 */
export async function exportToPng(element, metadata = {}) {
  const h2c = await loadHtml2CanvasLazy();

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const bgColor = isLight ? '#ffffff' : '#131b2e';

  const canvas = await h2c(element, {
    scale: 2,
    backgroundColor: bgColor,
    useCORS: true,
    logging: false
  });

  const imageURI = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const optName = metadata.optionName ? `_Opcion_${metadata.optionName}` : '';
  link.download = `Horario_Optimizado${optName}_${dateStr}.png`;
  link.href = imageURI;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera y descarga un archivo .ics (RFC 5545) compatible con Google Calendar, Apple Calendar y Outlook.
 * @param {Array<Object>} selectedSections - Secciones que componen el horario.
 * @param {Object} [options={}] - Configuración de fechas del ciclo.
 */
export function exportToIcs(selectedSections, options = {}) {
  if (!selectedSections || selectedSections.length === 0) {
    throw new Error('No hay secciones seleccionadas para exportar.');
  }

  // Días base: 0 = Lunes, ..., 6 = Domingo
  const BYDAY_MAP = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  // Fecha de inicio del ciclo (por defecto el próximo lunes)
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes
  const daysUntilNextMonday = ((1 - currentDay + 7) % 7) || 7;
  const cycleStartDate = options.startDate
    ? new Date(options.startDate)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextMonday);

  const numWeeks = options.weeks || APP_CONFIG.DEFAULT_SEMESTER_WEEKS;
  const cycleEndDate = options.endDate
    ? new Date(options.endDate)
    : new Date(cycleStartDate.getTime() + numWeeks * 7 * 24 * 60 * 60 * 1000);

  const formatIcsDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const pad = (n) => String(n).padStart(2, '0');

  const formatIcsLocalDate = (d, min) => {
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(Math.floor(min / 60));
    const mins = pad(min % 60);
    return `${year}${month}${day}T${hours}${mins}00`;
  };

  const untilStr = formatIcsDate(cycleEndDate);

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Armador de Horarios UPAO//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Horario Académico UPAO',
    'X-WR-TIMEZONE:America/Lima',
    'BEGIN:VTIMEZONE',
    'TZID:America/Lima',
    'X-LIC-LOCATION:America/Lima',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0500',
    'TZNAME:PET',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  selectedSections.forEach((sec) => {
    (sec.slots || []).forEach((slot) => {
      // Calcular la fecha del primer evento en la semana de inicio
      // cycleStartDate es Lunes (day 0)
      const eventFirstDate = new Date(cycleStartDate.getTime());
      eventFirstDate.setDate(eventFirstDate.getDate() + slot.day);

      const dtStart = formatIcsLocalDate(eventFirstDate, slot.startMin);
      const dtEnd = formatIcsLocalDate(eventFirstDate, slot.endMin);
      const uid = `horario_${sec.sectionId || 'sec'}_${slot.day}_${slot.startMin}@upao.horarios`;

      const byDay = BYDAY_MAP[slot.day] || 'MO';

      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART;TZID=America/Lima:${dtStart}`,
        `DTEND;TZID=America/Lima:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${untilStr};BYDAY=${byDay}`,
        `SUMMARY:${sec.courseName} (${sec.sectionCode})`,
        `LOCATION:${slot.aula || sec.aula || 'Aula N/A'}`,
        `DESCRIPTION:Profesor: ${sec.professor || 'Docente'}\\nNRC: ${sec.sectionId || 'N/A'}\\nCréditos: ${sec.courseCredits || 0}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], {
    type: 'text/calendar;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Horario_Clases_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Invoca el diálogo de impresión del navegador con estilos optimizados @media print.
 */
export function printTimetable() {
  window.print();
}
