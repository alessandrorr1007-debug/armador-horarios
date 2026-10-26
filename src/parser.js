/**
 * @fileoverview Parser de texto para la oferta académica de la UPAO.
 * Convierte el texto copiado del portal universitario en objetos de curso y secciones estructurados.
 */

import { APP_CONFIG } from './config.js';
import { generateId } from './utils.js';

/**
 * @typedef {Object} ScheduleSlot
 * @property {string} dia - Nombre o abreviatura del día.
 * @property {string} horaInicio - Hora de inicio (ej. "07:00 AM").
 * @property {string} horaFin - Hora de fin (ej. "08:50 AM").
 * @property {string} aula - Aula o laboratorio asignado.
 */

/**
 * @typedef {Object} CourseSection
 * @property {string} nrc - Código NRC único de la sección.
 * @property {string} secc - Número o código de sección (ej. "01").
 * @property {string|null} idLiga - Identificador de liga del portal (ej. "T1", "P1").
 * @property {string|null} liga - Grupo de liga vinculado.
 * @property {string|null} tipoLiga - Tipo de componente (T = Teoría, P = Práctica, L = Laboratorio).
 * @property {string|null} grupoLiga - Número del grupo al que pertenece la liga.
 * @property {string} aula - Aula principal.
 * @property {string|null} dia - Día principal.
 * @property {string|null} horaInicio - Hora de inicio principal.
 * @property {string|null} horaFin - Hora de fin principal.
 * @property {string} docente - Nombre del docente asignado.
 * @property {ScheduleSlot[]} slots - Lista de horarios y aulas de esta sección.
 * @property {number|null} capa - Capacidad máxima de vacantes.
 * @property {number|null} regi - Número de alumnos registrados.
 * @property {number} cred - Créditos académicos.
 * @property {'ABIERTO'|'CERRADO'} estado - Estado de la sección en portal.
 * @property {boolean} incluirEnArmado - Si se incluye en el solver.
 */

/**
 * @typedef {Object} CourseItem
 * @property {string} codigo - Código del curso (ej. "CIEN-101").
 * @property {string} nombre - Nombre descriptivo del curso.
 * @property {CourseSection[]} sections - Secciones disponibles para el curso.
 * @property {number} creditosCurso - Créditos académicos máximos entre sus secciones.
 * @property {boolean} obligatorio - Si es marcado como troncal/obligatorio.
 */

/**
 * @typedef {Object} ParseDiagnostics
 * @property {CourseItem[]} courses - Cursos extraídos exitosamente.
 * @property {string[]} warnings - Advertencias no bloqueantes.
 * @property {string[]} errors - Errores de formato detectados.
 */

/**
 * Parsea el texto copiado del portal y devuelve diagnósticos detallados.
 * @param {string} text - Texto sin procesar del portapapeles.
 * @returns {ParseDiagnostics}
 */
export function parseScheduleTextWithDiagnostics(text) {
  const warnings = [];
  const errors = [];

  if (!text || typeof text !== 'string' || !text.trim()) {
    return {
      courses: [],
      warnings: [],
      errors: ['El texto proporcionado está vacío. Pega la tabla de cursos de tu portal académico.']
    };
  }

  if (text.length > APP_CONFIG.MAX_INPUT_TEXT_LENGTH) {
    return {
      courses: [],
      warnings: [],
      errors: [
        `El texto excede el límite máximo permitido (${Math.round(APP_CONFIG.MAX_INPUT_TEXT_LENGTH / 1024)} KB). Por favor pega los cursos de forma individual o en bloques más pequeños.`
      ]
    };
  }

  const lines = text.split('\n');
  const courseBlocks = [];
  let currentBlockLines = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    const isCourseTitleLine =
      /^[A-Z0-9\s-]+-\s*\(\s*[A-Z0-9_-]+\s*\)/i.test(trimmed) ||
      /^[A-Z0-9_-]{3,}\s*-\s*[A-Z]/i.test(trimmed) ||
      /^\(\s*[A-Z0-9_-]{3,}\s*\)\s*[A-Z]/i.test(trimmed);

    if (
      isCourseTitleLine &&
      currentBlockLines.length > 0 &&
      currentBlockLines.some((l) => l.includes('NRC') || l.includes('Sec'))
    ) {
      courseBlocks.push({ lines: currentBlockLines, startLine: lineIdx - currentBlockLines.length + 1 });
      currentBlockLines = [];
    }
    currentBlockLines.push(line);
  });

  if (currentBlockLines.length > 0) {
    courseBlocks.push({ lines: currentBlockLines, startLine: lines.length - currentBlockLines.length + 1 });
  }

  const courses = [];

  courseBlocks.forEach((blockObj, bIdx) => {
    const blockText = blockObj.lines.join('\n');
    const firstLine = blockObj.lines
      .map((l) => l.trim())
      .find(
        (l) =>
          l.length > 0 &&
          !l.startsWith('Sec') &&
          !l.startsWith('NRC') &&
          !l.includes('🟢') &&
          !l.includes('🔴')
      );

    let courseCode = `CURSO_${bIdx + 1}`;
    let courseName = 'Curso Registrado';

    if (firstLine) {
      const codeMatch =
        firstLine.match(/\(\s*([A-Z0-9_-]+)\s*\)/i) || firstLine.match(/^([A-Z0-9_-]{3,})/i);
      if (codeMatch) courseCode = codeMatch[1].trim();

      courseName =
        firstLine
          .replace(/^([A-Z0-9\s-]+-\s*)?(\(\s*[A-Z0-9_-]+\s*\)\s*)?/i, '')
          .trim() || firstLine;
    }

    const sectionChunks = blockText
      .split(/(?=(?:NRC:?|Sec\s+[A-Z0-9]+))/i)
      .filter(
        (c) =>
          (/NRC/i.test(c) || /Sec\s+[A-Z0-9]+/i.test(c)) &&
          (/\d{1,2}:\d{2}/.test(c) || /ID LIGA|Grupo:/i.test(c))
      );

    if (sectionChunks.length === 0) {
      warnings.push(
        `El bloque "${courseCode} - ${courseName}" (línea ~${blockObj.startLine}) no contiene secciones reconocibles con horarios o NRC.`
      );
      return;
    }

    const sections = [];

    sectionChunks.forEach((chunk) => {
      const cLines = chunk
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l !== '');

      const getValueAfter = (label) => {
        const idx = cLines.findIndex((l) => l.toUpperCase().startsWith(label.toUpperCase()));
        if (idx === -1) return null;
        const sameLine = cLines[idx].substring(label.length).trim();
        if (sameLine) return sameLine;
        return cLines[idx + 1] ? cLines[idx + 1].trim() : null;
      };

      let nrc = getValueAfter('NRC:');
      let secc = getValueAfter('SECC:');
      let idLiga = getValueAfter('ID LIGA:');
      let liga = getValueAfter('LIGA:');
      const capaRaw = getValueAfter('CAPA:');
      const regiRaw = getValueAfter('REGI:');
      const credRaw = getValueAfter('CRED:');

      const secHeaderMatch = chunk.match(/Sec\s*([A-Z0-9]+)?\s*\(?\s*NRC:?\s*(\d+)\s*\)?/i);
      if (secHeaderMatch) {
        if (secHeaderMatch[1] && secHeaderMatch[2]) {
          secc = secHeaderMatch[1];
          nrc = secHeaderMatch[2];
        } else if (secHeaderMatch[1] && !nrc) {
          nrc = secHeaderMatch[1];
        }
      }

      const ligaMatch = chunk.match(/Grupo:\s*([A-Z0-9]+)\s*➔\s*([A-Z0-9]+)/i);
      if (ligaMatch) {
        if (!idLiga) idLiga = ligaMatch[1];
        if (!liga) liga = ligaMatch[2];
      }

      let tipoLiga = null;
      let grupoLiga = null;
      if (idLiga) {
        tipoLiga = idLiga.charAt(0).toUpperCase();
        grupoLiga = idLiga.replace(/\D/g, '');
      }

      const isClosed = /CERRADO|🔴/i.test(chunk);
      const capa = capaRaw ? capaRaw.replace(/\D/g, '') : null;
      const regi = regiRaw ? regiRaw.replace(/CERRADO/i, '').trim().replace(/\D/g, '') : null;
      const cred = credRaw ? parseInt(credRaw.replace(/\D/g, ''), 10) || 0 : 0;

      const slots = [];
      let docente = null;
      let aula = null;

      for (let k = 0; k < cLines.length; k++) {
        const dataLine = cLines[k];
        const dayMatch = dataLine.match(
          /\b(LUN|MAR|MIE|MIERCOLES|MIÉRCOLES|JUE|VIE|SAB|SÁBADO|DOM),?\b/i
        );
        const timeMatch = dataLine.match(
          /(\d{1,2}:\d{2}\s*[AP]M)\s*[-aA]\s*(\d{1,2}:\d{2}\s*[AP]M)/i
        );

        if (dayMatch && timeMatch) {
          const diaStr = dayMatch[1];
          const startStr = timeMatch[1];
          const endStr = timeMatch[2];

          const aulaMatch =
            dataLine.match(/\b([A-Z]\d{3}|Lab\d*|PAB\d*)\b/i) || dataLine.match(/\((G\d+)\)/i);
          if (aulaMatch) aula = aulaMatch[1];

          const docMatch = dataLine.match(/\d{5,}\s+(.+)$/);
          if (docMatch) docente = docMatch[1].trim();

          slots.push({
            dia: diaStr,
            horaInicio: startStr,
            horaFin: endStr,
            aula: aula || 'Aula N/A'
          });
        }
      }

      if (!docente) {
        const docLine = cLines.find(
          (l) =>
            /[A-ZÁÉÍÓÚ]{3,}\s+[A-ZÁÉÍÓÚ]{3,}/i.test(l) &&
            !l.includes('PABE') &&
            !l.includes('PRESENCIAL') &&
            !l.includes('Sec') &&
            !l.includes('NRC') &&
            !l.includes('Cupos')
        );
        if (docLine) docente = docLine.trim();
      }

      const mainSlot = slots[0] || {};
      sections.push({
        nrc: nrc || generateId('sec'),
        secc: secc || '01',
        idLiga: idLiga || null,
        liga: liga || null,
        tipoLiga: tipoLiga,
        grupoLiga: grupoLiga,
        aula: mainSlot.aula || aula || 'Aula N/A',
        dia: mainSlot.dia || null,
        horaInicio: mainSlot.horaInicio || null,
        horaFin: mainSlot.horaFin || null,
        docente: docente || 'Docente asignado',
        slots: slots,
        capa: capa ? parseInt(capa, 10) : null,
        regi: regi ? parseInt(regi, 10) : null,
        cred: cred,
        estado: isClosed ? 'CERRADO' : 'ABIERTO',
        incluirEnArmado: !isClosed
      });
    });

    if (sections.length > 0) {
      const creditosCurso = Math.max(...sections.map((s) => s.cred || 0));
      courses.push({
        codigo: courseCode,
        nombre: courseName,
        sections,
        creditosCurso,
        obligatorio: false
      });
    }
  });

  if (courses.length === 0 && errors.length === 0) {
    errors.push(
      'No se pudo reconocer ningún curso en el texto pegado. Verifica haber seleccionado la tabla completa con el nombre del curso, NRCs y horarios.'
    );
  }

  return { courses, warnings, errors };
}

/**
 * Función pública compatible que devuelve directamente el array de cursos.
 * @param {string} text - Texto del portal.
 * @returns {CourseItem[]} Lista de cursos extraídos.
 */
export function parseScheduleText(text) {
  const result = parseScheduleTextWithDiagnostics(text);
  return result.courses;
}
