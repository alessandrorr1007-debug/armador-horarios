/**
 * @fileoverview Motor de resolución combinatoria de horarios con ligas y restricciones de créditos.
 * Implementa el algoritmo de backtracking en 2 fases con preservación estricta de ligas.
 */

import { DAY_ALIASES, APP_CONFIG } from './config.js';
import { timeStringToMin, generateId } from './utils.js';
import { calculateSolutionMetrics } from './metrics.js';

/**
 * Verifica si existe cruce de horarios entre una sección candidata y las secciones ya seleccionadas en un combo interno.
 * @param {Object} targetSection - Sección que se desea agregar.
 * @param {Array<Object>} currentCombo - Secciones ya acumuladas en el combo.
 * @returns {boolean} True si hay colisión horaria.
 */
export function hasInternalOverlap(targetSection, currentCombo) {
  for (const sec of currentCombo) {
    for (const slotA of targetSection.slots) {
      for (const slotB of sec.slots) {
        if (slotA.day === slotB.day) {
          if (slotA.startMin < slotB.endMin && slotB.startMin < slotA.endMin) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Verifica si un grupo de secciones (un curso completo o su combo teoría+práctica) colisiona con la selección acumulada.
 * @param {Array<Object>} optionGroup - Grupo de secciones del curso.
 * @param {Array<Object>} selectedSections - Secciones ya elegidas en la solución parcial.
 * @returns {boolean} True si hay cruce con alguna sección ya elegida.
 */
export function hasOverlapWithSelection(optionGroup, selectedSections) {
  for (const targetSection of optionGroup) {
    for (const selected of selectedSections) {
      for (const slotA of targetSection.slots) {
        for (const slotB of selected.slots) {
          if (slotA.day === slotB.day) {
            if (slotA.startMin < slotB.endMin && slotB.startMin < slotA.endMin) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

/**
 * Compara dos soluciones para ordenar el listado según criterios de conveniencia.
 * @param {Object} a - Solución A.
 * @param {Object} b - Solución B.
 * @param {Object} [options={}] - Parámetros de ordenamiento.
 * @param {boolean} [options.workOptimizationActive=true] - Si prioriza evitar conflictos de indisponibilidad.
 * @param {number} [options.activeCreditLimitUsed=0] - Límite de créditos fijado.
 * @param {'deadTime'|'days'|'efficiency'|'credits'} [options.sortBy='deadTime'] - Criterio principal.
 * @returns {number}
 */
export function compareSolutions(a, b, options = {}) {
  const {
    workOptimizationActive = true,
    activeCreditLimitUsed = 0,
    sortBy = 'deadTime'
  } = options;

  if (workOptimizationActive) {
    const conflictA = a.hasUnavailabilityConflict || a.saturdayWorkConflict;
    const conflictB = b.hasUnavailabilityConflict || b.saturdayWorkConflict;
    if (conflictA !== conflictB) {
      return conflictA ? 1 : -1;
    }
  }

  // Si hay límite de créditos activo, priorizar la combinación más cercana al límite
  if (activeCreditLimitUsed > 0) {
    const limit = activeCreditLimitUsed;
    const gapA = limit - (a.totalCredits || 0);
    const gapB = limit - (b.totalCredits || 0);
    if (gapA !== gapB) return gapA - gapB;
  }

  // Ordenamiento personalizado
  if (sortBy === 'days') {
    if (a.activeDaysCount !== b.activeDaysCount) {
      return a.activeDaysCount - b.activeDaysCount;
    }
    return a.totalDeadTimeMin - b.totalDeadTimeMin;
  }

  if (sortBy === 'efficiency') {
    if (a.efficiencyPct !== b.efficiencyPct) {
      return b.efficiencyPct - a.efficiencyPct;
    }
    return a.totalDeadTimeMin - b.totalDeadTimeMin;
  }

  if (sortBy === 'credits') {
    if (a.totalCredits !== b.totalCredits) {
      return (b.totalCredits || 0) - (a.totalCredits || 0);
    }
    return a.totalDeadTimeMin - b.totalDeadTimeMin;
  }

  // Criterio por defecto: menor tiempo muerto (huecos)
  const diffDeadTime = a.totalDeadTimeMin - b.totalDeadTimeMin;
  if (Math.abs(diffDeadTime) < 30) {
    if (a.activeDaysCount !== b.activeDaysCount) {
      return a.activeDaysCount - b.activeDaysCount;
    }
  }

  return diffDeadTime;
}

/**
 * Resuelve las combinaciones de horarios respetando ligas, cursos obligatorios y límite de créditos.
 * @param {Array<Object>} courses - Lista de cursos con sus secciones.
 * @param {number} [creditLimit=0] - Límite de créditos (0 = sin límite).
 * @param {Array<Object>} [unavailabilityBlocks=[]] - Bloques de indisponibilidad.
 * @param {Object} [solverOptions={}] - Opciones de timeout y límites.
 * @returns {Array<Object>|{error: string, courses: string[]}}
 */
export function solveSchedulesWithLigas(
  courses,
  creditLimit = 0,
  unavailabilityBlocks = [],
  solverOptions = {}
) {
  const useCreditLimit = creditLimit > 0;
  const startTime = Date.now();
  const maxTimeout = solverOptions.timeoutMs || APP_CONFIG.SOLVER_TIMEOUT_MS;
  const maxSolutions = solverOptions.maxSolutions || APP_CONFIG.MAX_SOLUTIONS_LIMIT;

  const isTimedOut = () => Date.now() - startTime > maxTimeout;

  const courseCreditsList = [];
  const courseOptionsList = courses.map((course, idx) => {
    courseCreditsList[idx] = course.creditosCurso || 0;
    const allSections = course.sections;

    // Solo se consideran secciones ABIERTAS y marcadas como incluidas
    const activeSections = allSections.filter((s) => {
      return s.estado !== 'CERRADO' && s.incluirEnArmado === true;
    });

    const mappedSections = activeSections.map((s) => {
      const slotObjects =
        s.slots && s.slots.length > 0
          ? s.slots.map((sl) => {
              const dayIdx =
                DAY_ALIASES[sl.dia ? sl.dia.toLowerCase().replace(',', '') : 'lun'] ?? 0;
              const startMin = timeStringToMin(sl.horaInicio || '08:00 AM');
              const endMin = timeStringToMin(sl.horaFin || '10:00 AM');
              return {
                day: dayIdx,
                startMin,
                endMin,
                aula: sl.aula || s.aula || 'Aula N/A'
              };
            })
          : [
              {
                day:
                  DAY_ALIASES[s.dia ? s.dia.toLowerCase().replace(',', '') : 'lun'] ?? 0,
                startMin: timeStringToMin(s.horaInicio || '08:00 AM'),
                endMin: timeStringToMin(s.horaFin || '10:00 AM'),
                aula: s.aula || 'Aula N/A'
              }
            ];

      return {
        courseId: course.codigo,
        courseName: `${course.codigo} - ${course.nombre}`,
        sectionId: s.nrc || generateId('sec'),
        sectionCode: `Sec ${s.secc || '01'} (NRC ${s.nrc || 'N/A'})`,
        professor: s.docente || 'Docente asignado',
        idLiga: s.idLiga,
        tipoLiga:
          s.tipoLiga || (s.idLiga ? s.idLiga.charAt(0).toUpperCase() : null),
        grupoLiga:
          s.grupoLiga || (s.idLiga ? s.idLiga.replace(/\D/g, '') : null),
        courseCredits: course.creditosCurso || 0,
        slots: slotObjects
      };
    });

    const hasLigas = mappedSections.some((s) => s.grupoLiga);

    if (!hasLigas) {
      return mappedSections.map((sec) => [sec]);
    }

    const groupStructures = {};
    allSections.forEach((s) => {
      const gNum = s.grupoLiga || (s.idLiga ? s.idLiga.replace(/\D/g, '') : null);
      const tType =
        s.tipoLiga || (s.idLiga ? s.idLiga.charAt(0).toUpperCase() : null);
      if (gNum && tType) {
        if (!groupStructures[gNum]) groupStructures[gNum] = new Set();
        groupStructures[gNum].add(tType);
      }
    });

    const activeGroups = {};
    mappedSections.forEach((sec) => {
      const gNum = sec.grupoLiga;
      if (!activeGroups[gNum]) activeGroups[gNum] = {};
      const tType = sec.tipoLiga || 'UNICO';
      if (!activeGroups[gNum][tType]) activeGroups[gNum][tType] = [];
      activeGroups[gNum][tType].push(sec);
    });

    const validCourseOptions = [];

    Object.entries(activeGroups).forEach(([gNum, typeMap]) => {
      const requiredTypes = groupStructures[gNum]
        ? Array.from(groupStructures[gNum])
        : Object.keys(typeMap);
      const availableTypes = Object.keys(typeMap);

      const isCompleteGroup = requiredTypes.every((req) =>
        availableTypes.includes(req)
      );
      if (!isCompleteGroup) {
        return;
      }

      const subKeys = Object.keys(typeMap);

      function combineSubKeys(subIdx, currentCombo) {
        if (subIdx === subKeys.length) {
          validCourseOptions.push([...currentCombo]);
          return;
        }

        const currentSubKey = subKeys[subIdx];
        const candidateSections = typeMap[currentSubKey];

        for (const candidate of candidateSections) {
          if (!hasInternalOverlap(candidate, currentCombo)) {
            currentCombo.push(candidate);
            combineSubKeys(subIdx + 1, currentCombo);
            currentCombo.pop();
          }
        }
      }

      combineSubKeys(0, []);
    });

    return validCourseOptions;
  });

  const hasMandatory = courses.some((c) => c.obligatorio);
  const mandatoryIndices = [];
  const optionalIndices = [];

  courses.forEach((c, i) => {
    if (c.obligatorio) mandatoryIndices.push(i);
    else optionalIndices.push(i);
  });

  if (hasMandatory) {
    const mandatoryNoSections = mandatoryIndices.filter(
      (i) => courseOptionsList[i].length === 0
    );
    if (mandatoryNoSections.length > 0) {
      return {
        error: 'mandatory_no_sections',
        courses: mandatoryNoSections.map((i) => courses[i].codigo)
      };
    }
  }

  if (!useCreditLimit && !hasMandatory) {
    const courseWithoutOptions = courseOptionsList.findIndex(
      (opts) => opts.length === 0
    );
    if (courseWithoutOptions !== -1) {
      return null;
    }
  }

  if (!hasMandatory) {
    const validSolutions = [];

    function backtrack(
      courseIndex,
      currentSelection,
      currentCredits,
      includedIndices
    ) {
      if (isTimedOut() || validSolutions.length >= maxSolutions) return;

      if (courseIndex === courseOptionsList.length) {
        if (currentSelection.length === 0) return;
        if (useCreditLimit && currentCredits > creditLimit) return;

        const metrics = calculateSolutionMetrics(
          currentSelection,
          unavailabilityBlocks
        );
        validSolutions.push({
          selection: [...currentSelection],
          score: metrics.score,
          totalDeadTimeMin: metrics.totalDeadTimeMin,
          totalDeadTimeHours: metrics.totalDeadTimeHours,
          totalWeeklyHours: metrics.totalWeeklyHours,
          activeDaysCount: metrics.activeDaysCount,
          hasUnavailabilityConflict: metrics.hasUnavailabilityConflict,
          saturdayWorkConflict: metrics.saturdayWorkConflict,
          conflictReasons: metrics.conflictReasons,
          efficiencyPct: metrics.efficiencyPct,
          totalCredits: currentCredits,
          includedCourseIds: [...includedIndices]
        });
        return;
      }

      const optionsForCourse = courseOptionsList[courseIndex];

      if (useCreditLimit) {
        backtrack(
          courseIndex + 1,
          currentSelection,
          currentCredits,
          includedIndices
        );
      }

      if (optionsForCourse.length === 0) return;
      const courseCreds = courseCreditsList[courseIndex] || 0;

      for (const optionGroup of optionsForCourse) {
        if (isTimedOut() || validSolutions.length >= maxSolutions) break;
        if (useCreditLimit && currentCredits + courseCreds > creditLimit) continue;
        if (!hasOverlapWithSelection(optionGroup, currentSelection)) {
          optionGroup.forEach((sec) => currentSelection.push(sec));
          backtrack(
            courseIndex + 1,
            currentSelection,
            currentCredits + courseCreds,
            [...includedIndices, courseIndex]
          );
          optionGroup.forEach(() => currentSelection.pop());
        }
      }
    }

    backtrack(0, [], 0, []);

    if (validSolutions.length === 0) return null;

    validSolutions.sort((a, b) =>
      compareSolutions(a, b, {
        workOptimizationActive: solverOptions.workOptimizationActive ?? true,
        activeCreditLimitUsed: creditLimit,
        sortBy: solverOptions.sortBy || 'deadTime'
      })
    );
    return validSolutions;
  }

  // --- RESOLUCIÓN EN 2 FASES CON CURSOS OBLIGATORIOS ---
  const mandatoryCombos = [];

  function backtrackMandatory(
    idx,
    currentSelection,
    currentCredits,
    includedIndices
  ) {
    if (isTimedOut()) return;

    if (idx === mandatoryIndices.length) {
      if (currentSelection.length === 0) return;
      mandatoryCombos.push({
        selection: [...currentSelection],
        totalCredits: currentCredits,
        includedIndices: [...includedIndices]
      });
      return;
    }

    const courseIdx = mandatoryIndices[idx];
    const optionsForCourse = courseOptionsList[courseIdx];
    const courseCreds = courseCreditsList[courseIdx] || 0;

    for (const optionGroup of optionsForCourse) {
      if (isTimedOut()) break;
      if (!hasOverlapWithSelection(optionGroup, currentSelection)) {
        optionGroup.forEach((sec) => currentSelection.push(sec));
        backtrackMandatory(
          idx + 1,
          currentSelection,
          currentCredits + courseCreds,
          [...includedIndices, courseIdx]
        );
        optionGroup.forEach(() => currentSelection.pop());
      }
    }
  }

  backtrackMandatory(0, [], 0, []);

  if (mandatoryCombos.length === 0) {
    return {
      error: 'mandatory_conflict',
      courses: mandatoryIndices.map((i) => courses[i].codigo)
    };
  }

  let bestMandatory = mandatoryCombos[0];
  let bestMandatoryMetrics = calculateSolutionMetrics(
    bestMandatory.selection,
    unavailabilityBlocks
  );
  for (let i = 1; i < mandatoryCombos.length; i++) {
    const metrics = calculateSolutionMetrics(
      mandatoryCombos[i].selection,
      unavailabilityBlocks
    );
    if (metrics.totalDeadTimeMin < bestMandatoryMetrics.totalDeadTimeMin) {
      bestMandatory = mandatoryCombos[i];
      bestMandatoryMetrics = metrics;
    }
  }

  const mandatoryCredits = bestMandatory.totalCredits;
  const exceedsWarning = useCreditLimit && mandatoryCredits > creditLimit;
  const remainingBudget = useCreditLimit
    ? Math.max(0, creditLimit - mandatoryCredits)
    : Infinity;

  const validSolutions = [];

  function backtrackOptional(
    idx,
    currentSelection,
    currentCredits,
    includedIndices
  ) {
    if (isTimedOut() || validSolutions.length >= maxSolutions) return;

    if (idx === optionalIndices.length) {
      const totalCredits = mandatoryCredits + currentCredits;
      if (useCreditLimit && totalCredits > creditLimit) return;

      const mergedSelection = [...bestMandatory.selection, ...currentSelection];
      const metrics = calculateSolutionMetrics(
        mergedSelection,
        unavailabilityBlocks
      );
      validSolutions.push({
        selection: mergedSelection,
        score: metrics.score,
        totalDeadTimeMin: metrics.totalDeadTimeMin,
        totalDeadTimeHours: metrics.totalDeadTimeHours,
        totalWeeklyHours: metrics.totalWeeklyHours,
        activeDaysCount: metrics.activeDaysCount,
        hasUnavailabilityConflict: metrics.hasUnavailabilityConflict,
        saturdayWorkConflict: metrics.saturdayWorkConflict,
        conflictReasons: metrics.conflictReasons,
        efficiencyPct: metrics.efficiencyPct,
        totalCredits: totalCredits,
        includedCourseIds: [...bestMandatory.includedIndices, ...includedIndices],
        exceedsWarning: exceedsWarning
      });
      return;
    }

    const courseIdx = optionalIndices[idx];
    const optionsForCourse = courseOptionsList[courseIdx];
    const courseCreds = courseCreditsList[courseIdx] || 0;

    backtrackOptional(idx + 1, currentSelection, currentCredits, includedIndices);

    if (optionsForCourse.length === 0) return;

    for (const optionGroup of optionsForCourse) {
      if (isTimedOut() || validSolutions.length >= maxSolutions) break;
      if (useCreditLimit && currentCredits + courseCreds > remainingBudget) continue;
      if (
        !hasOverlapWithSelection(optionGroup, [
          ...bestMandatory.selection,
          ...currentSelection
        ])
      ) {
        optionGroup.forEach((sec) => currentSelection.push(sec));
        backtrackOptional(
          idx + 1,
          currentSelection,
          currentCredits + courseCreds,
          [...includedIndices, courseIdx]
        );
        optionGroup.forEach(() => currentSelection.pop());
      }
    }
  }

  backtrackOptional(0, [], 0, []);

  if (validSolutions.length === 0) return null;

  validSolutions.sort((a, b) =>
    compareSolutions(a, b, {
      workOptimizationActive: solverOptions.workOptimizationActive ?? true,
      activeCreditLimitUsed: creditLimit,
      sortBy: solverOptions.sortBy || 'deadTime'
    })
  );
  return validSolutions;
}
