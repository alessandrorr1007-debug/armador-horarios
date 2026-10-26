/**
 * @fileoverview Métricas de calidad, eficiencia y detección de colisiones de horarios.
 */

/**
 * @typedef {Object} UnavailabilityBlock
 * @property {string} id - Identificador único.
 * @property {string} name - Nombre descriptivo.
 * @property {number[]} days - Días de la semana afectados (0 = Lunes, ..., 6 = Domingo).
 * @property {number} startMin - Minuto de inicio desde medianoche.
 * @property {number} endMin - Minuto de fin desde medianoche.
 * @property {boolean} [active=true] - Si está habilitado.
 */

/**
 * @typedef {Object} SolutionMetrics
 * @property {number} score - Puntuación global calculada.
 * @property {number} totalDeadTimeMin - Minutos muertos (huecos) totales.
 * @property {number} totalDeadTimeHours - Horas muertas totales.
 * @property {number} totalWeeklyHours - Horas semanales totales de clase.
 * @property {number} activeDaysCount - Número de días distintos con clase.
 * @property {boolean} hasUnavailabilityConflict - Si colisiona con algún bloque de indisponibilidad activo.
 * @property {boolean} saturdayWorkConflict - Flag de compatibilidad previa para sábado laboral.
 * @property {string[]} conflictReasons - Nombres de los bloques con los que colisiona.
 * @property {number} efficiencyPct - Índice de compactación en porcentaje (0-100%).
 */

/**
 * Calcula las métricas de una combinación de secciones.
 * @param {Array<Object>} selection - Lista de secciones que componen la solución.
 * @param {UnavailabilityBlock[]} [unavailabilityBlocks=[]] - Bloques de indisponibilidad a verificar.
 * @returns {SolutionMetrics}
 */
export function calculateSolutionMetrics(selection, unavailabilityBlocks = []) {
  let totalWeeklyMin = 0;
  let totalDeadTimeMin = 0;
  const activeDays = new Set();
  let hasUnavailabilityConflict = false;
  let saturdayWorkConflict = false;
  const conflictReasons = [];

  const activeBlocks = (unavailabilityBlocks || []).filter((b) => b.active !== false);

  const dayClassesMap = {};
  for (let i = 0; i < 7; i++) {
    dayClassesMap[i] = [];
  }

  selection.forEach((item) => {
    (item.slots || []).forEach((slot) => {
      const duration = Math.max(0, slot.endMin - slot.startMin);
      totalWeeklyMin += duration;
      activeDays.add(slot.day);
      dayClassesMap[slot.day].push({ start: slot.startMin, end: slot.endMin });

      // Verificación de compatibilidad con bloque sábado histórico (< 15:30)
      if (slot.day === 5 && slot.startMin < 930) {
        saturdayWorkConflict = true;
      }

      // Verificación de bloques de indisponibilidad parametrizados
      activeBlocks.forEach((block) => {
        if (block.days && block.days.includes(slot.day)) {
          if (slot.startMin < block.endMin && block.startMin < slot.endMin) {
            hasUnavailabilityConflict = true;
            if (!conflictReasons.includes(block.name)) {
              conflictReasons.push(block.name);
            }
          }
        }
      });
    });
  });

  // Cálculo de tiempo muerto entre clases del mismo día
  Object.keys(dayClassesMap).forEach((dayKey) => {
    const classes = dayClassesMap[dayKey];
    if (classes.length > 1) {
      classes.sort((a, b) => a.start - b.start);
      for (let k = 0; k < classes.length - 1; k++) {
        const gapMin = classes[k + 1].start - classes[k].end;
        // Se ignora el cambio de aula normal de 5 minutos
        if (gapMin > 5) {
          totalDeadTimeMin += gapMin;
        }
      }
    }
  });

  const totalDeadTimeHours = totalDeadTimeMin / 60;
  const totalWeeklyHours = totalWeeklyMin / 60;
  const activeDaysCount = activeDays.size;

  let score = 1000000;
  if (hasUnavailabilityConflict || saturdayWorkConflict) {
    score -= 500000;
  }
  score -= totalDeadTimeMin * 100;
  score -= activeDaysCount * 1000;

  const efficiencyPct = Math.max(
    0,
    Math.min(100, Math.round(100 - totalDeadTimeHours * 5))
  );

  return {
    score,
    totalDeadTimeMin,
    totalDeadTimeHours,
    totalWeeklyHours,
    activeDaysCount,
    hasUnavailabilityConflict,
    saturdayWorkConflict,
    conflictReasons,
    efficiencyPct
  };
}
