/**
 * @fileoverview Controlador de interfaz de usuario, eventos, navegación de pasos y modales.
 */

import { store } from './store.js';
import { parseScheduleTextWithDiagnostics } from './parser.js';
import { solveSchedulesWithLigas } from './solver.js';
import { renderTimetableGrid, renderAgendaView } from './grid.js';
import { exportToPng, exportToIcs, printTimetable } from './exporter.js';
import { exportSessionJson, importSessionJson } from './storage.js';
import { copyToClipboard } from './utils.js';

let solverWorker = null;

/**
 * Muestra una notificación tipo Toast accesible en la esquina inferior.
 * @param {string} message - Mensaje a mostrar.
 * @param {'info'|'success'|'warning'|'danger'} [type='info'] - Tipo de notificación.
 * @param {Object} [action] - Botón de acción opcional { label, onClick }.
 */
export function showToast(message, type = 'info', action = null) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  const iconMap = {
    info: 'ri-information-line',
    success: 'ri-checkbox-circle-line',
    warning: 'ri-alert-line',
    danger: 'ri-error-warning-line'
  };

  const iconEl = document.createElement('i');
  iconEl.className = iconMap[type] || 'ri-information-line';

  const textEl = document.createElement('span');
  textEl.className = 'toast-message';
  textEl.textContent = message;

  toast.appendChild(iconEl);
  toast.appendChild(textEl);

  if (action && typeof action.onClick === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-action-btn';
    actionBtn.textContent = action.label || 'Acción';
    actionBtn.addEventListener('click', () => {
      action.onClick();
      toast.remove();
    });
    toast.appendChild(actionBtn);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Cerrar aviso');
  closeBtn.innerHTML = '<i class="ri-close-line"></i>';
  closeBtn.addEventListener('click', () => toast.remove());
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  const duration = action ? 7000 : 4000;
  setTimeout(() => {
    if (toast.isConnected) {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/**
 * Modal de confirmación accesible con soporte de teclado (Escape/Enter).
 * @param {string} title - Título del diálogo.
 * @param {string} message - Descripción de la acción.
 * @param {Function} onConfirm - Callback a ejecutar si se confirma.
 * @param {Object} [options={}] - Opciones de etiquetas.
 */
export function confirmModal(title, message, onConfirm, options = {}) {
  const existing = document.getElementById('app-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'app-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'modal-dialog-title');

  const card = document.createElement('div');
  card.className = 'modal-card';

  const titleEl = document.createElement('h3');
  titleEl.id = 'modal-dialog-title';
  titleEl.textContent = title;

  const descEl = document.createElement('p');
  descEl.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = options.cancelLabel || 'Cancelar';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = `btn ${options.isDanger ? 'btn-danger' : 'btn-primary'}`;
  confirmBtn.textContent = options.confirmLabel || 'Aceptar';

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);

  card.appendChild(titleEl);
  card.appendChild(descEl);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  confirmBtn.focus();

  const close = () => overlay.remove();

  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', () => {
    close();
    onConfirm();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/**
 * Cambia la vista del paso actual y gestiona el foco y accesibilidad.
 * @param {number} stepNumber - Paso al que navegar (1, 2 o 3).
 */
export function goToStep(stepNumber) {
  store.setState({ currentStep: stepNumber });

  document.querySelectorAll('.step-card').forEach((card) => {
    card.style.display = 'none';
  });

  document.querySelectorAll('.step-item').forEach((item) => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');
  });

  const activeSection = document.getElementById(`step-${stepNumber}-section`);
  const activeNav = document.getElementById(`step-nav-${stepNumber}`);

  if (activeSection) {
    activeSection.style.display = 'block';
    const heading = activeSection.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  if (activeNav) {
    activeNav.classList.add('active');
    activeNav.setAttribute('aria-current', 'step');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Renderiza el Paso 2 (Editor interactivo de Cursos y Secciones).
 */
export function renderStep2Editor() {
  const container = document.getElementById('courses-editor-list');
  if (!container) return;

  container.innerHTML = '';
  const { coursesData } = store.getState();

  if (coursesData.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state-card';
    emptyState.innerHTML = `
      <i class="ri-book-read-line empty-icon"></i>
      <h3>No hay cursos registrados</h3>
      <p>Copia y pega la tabla de tus cursos en el Paso 1 para comenzar a armar tu horario.</p>
      <button class="btn btn-primary" id="btn-empty-goto-step1">
        <i class="ri-arrow-left-line"></i> Ir al Paso 1
      </button>
    `;
    emptyState.querySelector('#btn-empty-goto-step1').addEventListener('click', () => goToStep(1));
    container.appendChild(emptyState);
    return;
  }

  coursesData.forEach((course, cIdx) => {
    const card = document.createElement('div');
    card.className = 'course-edit-card';

    // Header del Curso
    const header = document.createElement('div');
    header.className = 'course-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'course-title-group';

    const titleLabel = document.createElement('label');
    titleLabel.className = 'sr-only';
    titleLabel.setAttribute('for', `course-title-${cIdx}`);
    titleLabel.textContent = `Nombre y código del curso ${cIdx + 1}`;

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = `course-title-${cIdx}`;
    titleInput.className = 'course-title-input';
    titleInput.value = `${course.codigo} - ${course.nombre}`;
    titleInput.setAttribute('aria-label', `Editar código y nombre de ${course.nombre}`);

    titleInput.addEventListener('change', (e) => {
      const parts = e.target.value.split(' - ');
      course.codigo = (parts[0] || course.codigo).trim();
      course.nombre = (parts[1] || course.nombre).trim();
      store.setState({ coursesData: [...coursesData] });
    });

    const credBadge = document.createElement('span');
    credBadge.className = 'badge-status badge-lg course-cred-badge';
    credBadge.textContent = `${course.creditosCurso} ${course.creditosCurso === 1 ? 'crédito' : 'créditos'}`;

    const mandatoryLabel = document.createElement('label');
    mandatoryLabel.className = 'toggle-mandatory-label';
    mandatoryLabel.title = 'Fija este curso en el horario sin importar el límite de créditos';

    const mandatoryCb = document.createElement('input');
    mandatoryCb.type = 'checkbox';
    mandatoryCb.className = 'toggle-mandatory-cb';
    mandatoryCb.checked = Boolean(course.obligatorio);
    mandatoryCb.setAttribute('aria-label', `Marcar ${course.nombre} como curso obligatorio`);

    mandatoryCb.addEventListener('change', (e) => {
      course.obligatorio = e.target.checked;
      store.setState({ coursesData: [...coursesData] });
    });

    mandatoryLabel.appendChild(mandatoryCb);
    mandatoryLabel.appendChild(document.createTextNode(' Obligatorio'));

    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    titleGroup.appendChild(credBadge);
    titleGroup.appendChild(mandatoryLabel);

    const cardActions = document.createElement('div');
    cardActions.className = 'course-card-actions';

    const delCourseBtn = document.createElement('button');
    delCourseBtn.className = 'btn btn-secondary btn-small btn-danger-ghost';
    delCourseBtn.setAttribute('aria-label', `Eliminar curso ${course.nombre}`);
    delCourseBtn.innerHTML = '<i class="ri-delete-bin-line"></i> Eliminar Curso';

    delCourseBtn.addEventListener('click', () => {
      confirmModal(
        '¿Eliminar curso?',
        `Se eliminará "${course.codigo} - ${course.nombre}" con todas sus secciones.`,
        () => {
          const removed = coursesData.splice(cIdx, 1)[0];
          store.setState({ coursesData: [...coursesData] });
          renderStep2Editor();
          updateCourseCountBadges();
          showToast(`Curso "${removed.nombre}" eliminado`, 'info', {
            label: 'Deshacer',
            onClick: () => {
              coursesData.splice(cIdx, 0, removed);
              store.setState({ coursesData: [...coursesData] });
              renderStep2Editor();
              updateCourseCountBadges();
            }
          });
        },
        { isDanger: true }
      );
    });

    cardActions.appendChild(delCourseBtn);
    header.appendChild(titleGroup);
    header.appendChild(cardActions);
    card.appendChild(header);

    // Grid de Secciones
    const secGrid = document.createElement('div');
    secGrid.className = 'section-chips-grid';

    course.sections.forEach((sec, sIdx) => {
      const chip = document.createElement('div');
      const isIncluded = sec.incluirEnArmado === true;
      chip.className = `section-chip ${!isIncluded ? 'chip-closed' : ''}`;

      const chipHeader = document.createElement('div');
      chipHeader.className = 'section-chip-header';

      const chipLeft = document.createElement('div');
      const secCodeBadge = document.createElement('span');
      secCodeBadge.className = 'section-code-badge';
      secCodeBadge.textContent = `Sec ${sec.secc || '01'} (NRC ${sec.nrc || 'N/A'})`;

      const statusBadge = document.createElement('span');
      statusBadge.className = `badge-status ${isIncluded ? 'badge-open' : 'badge-closed'}`;
      statusBadge.textContent = isIncluded ? 'ABIERTO' : 'CERRADO';

      chipLeft.appendChild(secCodeBadge);
      chipLeft.appendChild(statusBadge);

      if (sec.idLiga || sec.liga) {
        const ligaBadge = document.createElement('span');
        ligaBadge.className = 'badge-status liga-badge';
        ligaBadge.textContent = `Grupo ${sec.grupoLiga || '1'}: ${sec.tipoLiga || 'T'} (${sec.idLiga || 'N/A'})`;
        chipLeft.appendChild(ligaBadge);
      }

      const delSecBtn = document.createElement('button');
      delSecBtn.className = 'btn-icon btn-small btn-icon-danger';
      delSecBtn.setAttribute(
        'aria-label',
        `Eliminar sección ${sec.secc} de ${course.nombre}`
      );
      delSecBtn.innerHTML = '<i class="ri-close-line"></i>';
      delSecBtn.addEventListener('click', () => {
        course.sections.splice(sIdx, 1);
        store.setState({ coursesData: [...coursesData] });
        renderStep2Editor();
      });

      chipHeader.appendChild(chipLeft);
      chipHeader.appendChild(delSecBtn);
      chip.appendChild(chipHeader);

      const docP = document.createElement('p');
      docP.className = 'section-doc';
      docP.innerHTML = `<i class="ri-user-2-line"></i> ${escape(sec.docente || 'Docente asignado')}`;
      chip.appendChild(docP);

      const slotUl = document.createElement('ul');
      slotUl.className = 'slot-list';

      if (sec.slots && sec.slots.length > 0) {
        sec.slots.forEach((sl) => {
          const li = document.createElement('li');
          const timeText = `${sl.horaInicio} - ${sl.horaFin} (${sl.aula || 'Aula N/A'})`;
          li.innerHTML = `<i class="ri-time-line"></i> <strong>${(sl.dia || 'DÍA').toUpperCase()}:</strong> ${timeText}`;
          slotUl.appendChild(li);
        });
      }

      const metaLi = document.createElement('li');
      metaLi.className = 'slot-meta';
      metaLi.innerHTML = `<i class="ri-group-line"></i> Cupos: ${sec.regi !== null ? sec.regi : 'N/A'} / ${sec.capa !== null ? sec.capa : 'N/A'}`;
      slotUl.appendChild(metaLi);
      chip.appendChild(slotUl);

      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'sec-toggle-label';

      const toggleCb = document.createElement('input');
      toggleCb.type = 'checkbox';
      toggleCb.className = 'sec-avail-checkbox';
      toggleCb.checked = isIncluded;
      toggleCb.setAttribute(
        'aria-label',
        `Incluir sección ${sec.secc} de ${course.nombre}`
      );

      toggleCb.addEventListener('change', (e) => {
        sec.incluirEnArmado = e.target.checked;
        chip.classList.toggle('chip-closed', !sec.incluirEnArmado);
        if (sec.incluirEnArmado) {
          statusBadge.className = 'badge-status badge-open';
          statusBadge.textContent = 'ABIERTO';
        } else {
          statusBadge.className = 'badge-status badge-closed';
          statusBadge.textContent = 'CERRADO';
        }
        store.setState({ coursesData: [...coursesData] });
      });

      toggleLabel.appendChild(toggleCb);
      toggleLabel.appendChild(
        document.createTextNode(
          sec.estado === 'CERRADO'
            ? 'Sección cerrada en portal (desmarcada)'
            : 'Incluir esta sección en el armado'
        )
      );
      chip.appendChild(toggleLabel);

      secGrid.appendChild(chip);
    });

    card.appendChild(secGrid);
    container.appendChild(card);
  });
}

function escape(str) {
  return String(str || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}

/**
 * Actualiza los badges contadores de cursos en Paso 1 y Paso 2.
 */
export function updateCourseCountBadges() {
  const { coursesData } = store.getState();
  const count = coursesData.length;
  const badgeText = `Cursos cargados: ${count}`;

  const b1 = document.getElementById('course-count-badge-step1');
  const b2 = document.getElementById('course-count-badge');
  const btnView = document.getElementById('btn-view-courses-list');
  const creditTotalInfo = document.getElementById('credit-total-info');

  if (b1) b1.textContent = badgeText;
  if (b2) b2.textContent = badgeText;
  if (btnView) btnView.style.display = count > 0 ? 'inline-flex' : 'none';

  if (creditTotalInfo) {
    const totalCred = coursesData.reduce((sum, c) => sum + (c.creditosCurso || 0), 0);
    creditTotalInfo.textContent = `Total disponibles: ${totalCred} créditos en ${count} curso${count === 1 ? '' : 's'}`;
  }
}

/**
 * Renderiza los resultados en el Paso 3 (Selector de Soluciones y Cuadrícula / Agenda).
 */
export function renderStep3Results() {
  const {
    generatedSolutions,
    activeSolutionIndex,
    coursesData,
    activeCreditLimit,
    gridPreset,
    viewMode,
    favoriteSolutions
  } = store.getState();

  if (!generatedSolutions || generatedSolutions.length === 0) return;

  const currentSol = generatedSolutions[activeSolutionIndex] || generatedSolutions[0];

  // Píldoras de Solución
  const solutionsBar = document.getElementById('solutions-selector-bar');
  const solutionsPills = document.getElementById('solutions-pills');

  if (solutionsBar && solutionsPills) {
    if (generatedSolutions.length > 1) {
      solutionsBar.style.display = 'flex';
      solutionsPills.innerHTML = '';

      generatedSolutions.slice(0, 8).forEach((sol, idx) => {
        const pill = document.createElement('button');
        const isActive = idx === activeSolutionIndex;
        const isFav = favoriteSolutions.has(idx);

        pill.className = `sol-pill ${isActive ? 'active' : ''}`;
        pill.setAttribute('aria-pressed', isActive ? 'true' : 'false');

        const credText = activeCreditLimit > 0 ? ` · ${sol.totalCredits || 0}cr` : '';
        const starIcon = isFav ? ' ★' : '';

        let extraText;
        if (sol.hasUnavailabilityConflict || sol.saturdayWorkConflict) {
          extraText = `${credText} · Choque horario`;
        } else if (sol.totalDeadTimeMin === 0) {
          extraText = `${credText} · 0h huecos`;
        } else {
          extraText = `${credText} · ${sol.totalDeadTimeHours.toFixed(1)}h huecos`;
        }

        const countInc = (sol.includedCourseIds || []).length;
        pill.textContent = `Opción ${idx + 1} (${countInc} c.)${extraText}${starIcon}`;

        pill.addEventListener('click', () => {
          store.setState({ activeSolutionIndex: idx });
          renderStep3Results();
        });

        solutionsPills.appendChild(pill);
      });
    } else {
      solutionsBar.style.display = 'none';
    }
  }

  // Métricas
  const totalCursosCargados = coursesData.length;
  const totalCursosIncluidos = currentSol.selection.length;
  const metricCourses = document.getElementById('metric-total-courses');
  const metricHours = document.getElementById('metric-weekly-hours');
  const metricGaps = document.getElementById('metric-gap-hours');
  const metricEff = document.getElementById('metric-efficiency');

  if (metricCourses) {
    metricCourses.textContent = `${totalCursosIncluidos}${activeCreditLimit > 0 ? '/' + totalCursosCargados : ''}`;
  }
  if (metricHours) metricHours.textContent = `${currentSol.totalWeeklyHours.toFixed(1)}h`;
  if (metricGaps) metricGaps.textContent = `${currentSol.totalDeadTimeHours.toFixed(1)}h`;
  if (metricEff) metricEff.textContent = `${currentSol.efficiencyPct}%`;

  // Resumen de créditos
  const creditSummary = document.getElementById('credit-summary');
  const creditSummaryText = document.getElementById('credit-summary-text');
  const creditExcludedText = document.getElementById('credit-excluded-text');

  if (activeCreditLimit > 0 && creditSummary) {
    creditSummary.style.display = 'block';
    const usedCred = currentSol.totalCredits || 0;
    if (currentSol.exceedsWarning) {
      creditSummaryText.textContent = `⚠ Los cursos obligatorios exceden el límite: ${usedCred} / ${activeCreditLimit} créditos`;
    } else {
      creditSummaryText.textContent = `Créditos utilizados: ${usedCred} / ${activeCreditLimit} créditos máximos`;
    }

    const includedIds = new Set(currentSol.includedCourseIds || []);
    const excludedCourses = coursesData.filter((_, idx) => !includedIds.has(idx));
    if (excludedCourses.length > 0) {
      const names = excludedCourses.map((c) => `${c.codigo} (${c.creditosCurso || 0}cr)`).join(', ');
      creditExcludedText.textContent = `Cursos excluidos para respetar el límite: ${names}`;
    } else {
      creditExcludedText.textContent = '';
    }
  } else if (creditSummary) {
    creditSummary.style.display = 'none';
  }

  // Leyenda de Colores
  const legendEl = document.getElementById('timetable-legend');
  if (legendEl) {
    legendEl.innerHTML = '';
    currentSol.selection.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'legend-item';

      const dot = document.createElement('span');
      dot.className = 'legend-dot';

      // Encontrar color
      const cIdx = coursesData.findIndex((c) => c.codigo === item.courseId);
      const color = cIdx !== -1 ? ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#ea580c', '#be185d'][cIdx % 8] : '#4f46e5';
      dot.style.background = color;

      const label = document.createElement('span');
      label.innerHTML = `<strong>${escape(item.courseName)}</strong> (${escape(item.sectionCode)})`;

      itemEl.appendChild(dot);
      itemEl.appendChild(label);
      legendEl.appendChild(itemEl);
    });
  }

  // Renderizar Cuadrícula o Agenda
  const gridEl = document.getElementById('timetable-grid');
  const agendaEl = document.getElementById('timetable-agenda');
  const scrollWrapper = document.querySelector('.timetable-scroll-container');

  if (viewMode === 'agenda') {
    if (scrollWrapper) scrollWrapper.style.display = 'none';
    if (agendaEl) {
      agendaEl.style.display = 'block';
      renderAgendaView(agendaEl, currentSol, coursesData);
    }
  } else {
    if (agendaEl) agendaEl.style.display = 'none';
    if (scrollWrapper) scrollWrapper.style.display = 'block';
    if (gridEl) renderTimetableGrid(gridEl, currentSol, coursesData, gridPreset);
  }
}

/**
 * Ejecuta el solver en un Web Worker (o fallback sincrónico) evitando congelar la interfaz.
 */
export function executeSolver() {
  const { coursesData, activeCreditLimit, unavailabilityBlocks, workOptimizationActive, sortBy } =
    store.getState();

  if (coursesData.length === 0) {
    showToast('Debes registrar al menos 1 curso para generar el horario.', 'warning');
    return;
  }

  const btnGenerate = document.getElementById('btn-generate-schedule');
  const originalText = btnGenerate ? btnGenerate.innerHTML : '';

  if (btnGenerate) {
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '<span class="spinner"></span> Optimizando combinaciones...';
  }

  const solverPayload = {
    courses: coursesData,
    creditLimit: activeCreditLimit,
    unavailabilityBlocks: workOptimizationActive ? unavailabilityBlocks : [],
    solverOptions: {
      workOptimizationActive,
      sortBy
    }
  };

  const handleSuccess = (solutions) => {
    if (btnGenerate) {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = originalText;
    }

    if (solutions && solutions.error) {
      const errorAlert = document.getElementById('mandatory-error-alert');
      const errorText = document.getElementById('mandatory-error-text');
      if (errorAlert && errorText) {
        if (solutions.error === 'mandatory_no_sections') {
          errorText.textContent = `Los cursos obligatorios (${solutions.courses.join(', ')}) no tienen secciones válidas habilitadas en el Paso 2.`;
        } else if (solutions.error === 'mandatory_conflict') {
          errorText.textContent = `Los cursos obligatorios (${solutions.courses.join(', ')}) colisionan entre sí. Quita la marca de obligatorio en alguno o selecciona secciones distintas.`;
        }
        errorAlert.style.display = 'flex';
      }
      return;
    }

    if (solutions && solutions.length > 0) {
      store.setState({
        generatedSolutions: solutions,
        activeSolutionIndex: 0
      });

      const conflictAlert = document.getElementById('conflict-alert');
      if (conflictAlert) conflictAlert.style.display = 'none';
      const mandatoryAlert = document.getElementById('mandatory-error-alert');
      if (mandatoryAlert) mandatoryAlert.style.display = 'none';

      renderStep3Results();
      goToStep(3);
      showToast(`¡Horarios generados! Se encontraron ${solutions.length} combinaciones posibles.`, 'success');
    } else {
      diagnoseAndShowConflicts();
    }
  };

  // Intentar ejecutar con Web Worker
  if (typeof Worker !== 'undefined') {
    try {
      if (solverWorker) solverWorker.terminate();
      solverWorker = new Worker(new URL('./solver.worker.js', import.meta.url), {
        type: 'module'
      });

      solverWorker.onmessage = (e) => {
        const { type, result, error } = e.data || {};
        if (type === 'SUCCESS') {
          handleSuccess(result);
        } else {
          console.warn('Worker error, fallback sincrónico:', error);
          const syncResult = solveSchedulesWithLigas(
            solverPayload.courses,
            solverPayload.creditLimit,
            solverPayload.unavailabilityBlocks,
            solverPayload.solverOptions
          );
          handleSuccess(syncResult);
        }
      };

      solverWorker.onerror = () => {
        // Fallback sincrónico en caso de fallo de worker (CORS o sandbox)
        const syncResult = solveSchedulesWithLigas(
          solverPayload.courses,
          solverPayload.creditLimit,
          solverPayload.unavailabilityBlocks,
          solverPayload.solverOptions
        );
        handleSuccess(syncResult);
      };

      solverWorker.postMessage({ type: 'SOLVE', payload: solverPayload });
      return;
    } catch {
      // Fallback sincrónico
    }
  }

  // Fallback sincrónico si no hay soporte de Web Worker
  setTimeout(() => {
    const syncResult = solveSchedulesWithLigas(
      solverPayload.courses,
      solverPayload.creditLimit,
      solverPayload.unavailabilityBlocks,
      solverPayload.solverOptions
    );
    handleSuccess(syncResult);
  }, 20);
}

function diagnoseAndShowConflicts() {
  const conflictAlert = document.getElementById('conflict-alert');
  const conflictList = document.getElementById('conflict-list');
  if (!conflictAlert || !conflictList) return;

  conflictList.innerHTML = '';
  const { coursesData } = store.getState();
  const messages = [];

  coursesData.forEach((c) => {
    const openSecs = c.sections.filter((s) => s.incluirEnArmado && s.estado !== 'CERRADO');
    if (openSecs.length === 0) {
      messages.push(`El curso "${c.codigo} - ${c.nombre}" no tiene ninguna sección habilitada.`);
    }
  });

  if (messages.length === 0) {
    messages.push('Existe un choque insalvable de horas o ligas incompletas entre los cursos seleccionados. Intenta habilitar más secciones en el Paso 2.');
  }

  messages.forEach((msg) => {
    const li = document.createElement('li');
    li.textContent = msg;
    conflictList.appendChild(li);
  });

  conflictAlert.style.display = 'flex';
  goToStep(3);
}

/**
 * Inicializa todos los eventos del DOM y shortcuts de teclado.
 */
export function initUiEventListeners() {
  // 1. Selector de tema claro/oscuro
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');

  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeIcon) themeIcon.className = 'ri-sun-line';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.className = 'ri-moon-line';
    }
  };

  themeToggle?.addEventListener('click', () => {
    const currentTheme = store.getState().theme;
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    store.setState({ theme: nextTheme });
    applyTheme(nextTheme);
  });

  // Aplicar tema inicial
  applyTheme(store.getState().theme);

  // 2. Procesamiento de Texto en Paso 1
  const btnProcessInput = document.getElementById('btn-process-input');
  const textInput = document.getElementById('text-input');
  const apiErrorCard = document.getElementById('api-error-card');
  const apiErrorTitle = document.getElementById('api-error-title');
  const apiErrorDesc = document.getElementById('api-error-desc');

  const processPastedText = () => {
    const rawVal = textInput?.value?.trim();
    if (apiErrorCard) apiErrorCard.style.display = 'none';

    if (!rawVal) {
      if (apiErrorCard && apiErrorTitle && apiErrorDesc) {
        apiErrorTitle.textContent = 'Campo de texto vacío';
        apiErrorDesc.textContent = 'Por favor pega la información de tus cursos desde tu portal académico.';
        apiErrorCard.style.display = 'flex';
      }
      return;
    }

    const { courses, warnings, errors } = parseScheduleTextWithDiagnostics(rawVal);

    if (errors.length > 0) {
      if (apiErrorCard && apiErrorTitle && apiErrorDesc) {
        apiErrorTitle.textContent = 'Formato de curso no reconocido';
        apiErrorDesc.textContent = errors.join(' ');
        apiErrorCard.style.display = 'flex';
      }
      return;
    }

    const { coursesData } = store.getState();
    const updatedCourses = [...coursesData];

    courses.forEach((newC) => {
      const idx = updatedCourses.findIndex((c) => c.codigo.toUpperCase() === newC.codigo.toUpperCase());
      if (idx !== -1) {
        updatedCourses[idx] = newC;
      } else {
        updatedCourses.push(newC);
      }
    });

    store.setState({ coursesData: updatedCourses });
    if (textInput) textInput.value = '';

    updateCourseCountBadges();
    renderStep2Editor();
    goToStep(2);

    if (warnings.length > 0) {
      showToast(warnings[0], 'warning');
    } else {
      showToast(`¡${courses.length} curso(s) procesado(s) exitosamente!`, 'success');
    }
  };

  btnProcessInput?.addEventListener('click', processPastedText);

  // Atajo Ctrl+Enter en textarea
  textInput?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      processPastedText();
    }
  });

  // 3. Botones de Navegación de Pasos
  document.getElementById('btn-back-to-step1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-add-more-courses')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-view-courses-list')?.addEventListener('click', () => goToStep(2));
  document.getElementById('btn-edit-courses-again')?.addEventListener('click', () => goToStep(2));

  // 4. Vaciar lista completa con confirmación y undo
  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    const { coursesData } = store.getState();
    if (coursesData.length === 0) return;

    confirmModal(
      '¿Vaciar todos los cursos?',
      'Esta acción eliminará todos los cursos cargados. Puedes deshacerla inmediatamente desde la notificación.',
      () => {
        const backup = [...coursesData];
        store.setState({ coursesData: [], generatedSolutions: [] });
        renderStep2Editor();
        updateCourseCountBadges();

        showToast('Lista de cursos vaciada', 'info', {
          label: 'Deshacer',
          onClick: () => {
            store.setState({ coursesData: backup });
            renderStep2Editor();
            updateCourseCountBadges();
          }
        });
      },
      { isDanger: true }
    );
  });

  // 5. Input de límite de créditos
  const creditLimitInput = document.getElementById('credit-limit-input');
  if (creditLimitInput) {
    creditLimitInput.value = store.getState().activeCreditLimit || '';
    creditLimitInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      store.setState({ activeCreditLimit: Math.max(0, val) });
    });
  }

  // 6. Botón de Generar Horario
  document.getElementById('btn-generate-schedule')?.addEventListener('click', executeSolver);

  // 7. Modo Optimización para Trabajo y Configuración de Indisponibilidad
  const btnWorkOpt = document.getElementById('btn-optimize-compact');
  btnWorkOpt?.addEventListener('click', () => {
    const current = store.getState().workOptimizationActive;
    store.setState({ workOptimizationActive: !current });
    syncWorkOptButton();

    const { generatedSolutions } = store.getState();
    if (generatedSolutions.length > 0) {
      executeSolver();
    }
  });

  function syncWorkOptButton() {
    if (!btnWorkOpt) return;
    const { workOptimizationActive } = store.getState();
    if (workOptimizationActive) {
      btnWorkOpt.classList.add('active');
      btnWorkOpt.innerHTML = '<i class="ri-check-double-line"></i> Restricción Laboral Activa';
    } else {
      btnWorkOpt.classList.remove('active');
      btnWorkOpt.innerHTML = '<i class="ri-briefcase-4-line"></i> Aplicar Restricción Laboral';
    }
  }
  syncWorkOptButton();

  // 8. Exportación PNG (Diferido)
  document.getElementById('btn-export-image')?.addEventListener('click', async () => {
    const wrapper = document.getElementById('timetable-wrapper');
    const btn = document.getElementById('btn-export-image');
    if (!wrapper || !btn) return;

    const originalHtml = btn.innerHTML;
    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generando Imagen...';
      const { activeSolutionIndex } = store.getState();
      await exportToPng(wrapper, { optionName: activeSolutionIndex + 1 });
      showToast('Horario descargado en PNG de alta calidad', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar la imagen: ' + err.message, 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  });

  // 9. Exportación a iCalendar (.ics)
  document.getElementById('btn-export-ics')?.addEventListener('click', () => {
    const { generatedSolutions, activeSolutionIndex } = store.getState();
    const currentSol = generatedSolutions[activeSolutionIndex];
    if (!currentSol) return;

    try {
      exportToIcs(currentSol.selection);
      showToast('Archivo .ics descargado para Google Calendar / Apple / Outlook', 'success');
    } catch (err) {
      showToast('Error al exportar calendario: ' + err.message, 'danger');
    }
  });

  // 10. Imprimir / PDF
  document.getElementById('btn-print-schedule')?.addEventListener('click', () => {
    printTimetable();
  });

  // 11. Copiar Lista de NRCs para Matrícula
  document.getElementById('btn-copy-nrcs')?.addEventListener('click', async () => {
    const { generatedSolutions, activeSolutionIndex } = store.getState();
    const currentSol = generatedSolutions[activeSolutionIndex];
    if (!currentSol) return;

    const nrcs = currentSol.selection.map((item) => item.sectionId).filter(Boolean);
    const text = nrcs.join(', ');

    const copied = await copyToClipboard(text);
    if (copied) {
      showToast(`NRCs copiados al portapapeles: ${text}`, 'success');
    } else {
      showToast('No se pudo copiar automáticamente. NRCs: ' + text, 'info');
    }
  });

  // 12. Alternar entre Cuadrícula y Agenda Móvil
  document.getElementById('btn-toggle-view-mode')?.addEventListener('click', () => {
    const currentMode = store.getState().viewMode;
    const nextMode = currentMode === 'grid' ? 'agenda' : 'grid';
    store.setState({ viewMode: nextMode });

    const btn = document.getElementById('btn-toggle-view-mode');
    if (btn) {
      btn.innerHTML =
        nextMode === 'agenda'
          ? '<i class="ri-grid-line"></i> Ver Cuadrícula'
          : '<i class="ri-list-check-2"></i> Ver Agenda Diaria';
    }
    renderStep3Results();
  });

  // 13. Selector de Preset de Cuadrícula (UPAO vs 1 Hora)
  const gridPresetSelect = document.getElementById('grid-preset-select');
  if (gridPresetSelect) {
    gridPresetSelect.value = store.getState().gridPreset;
    gridPresetSelect.addEventListener('change', (e) => {
      store.setState({ gridPreset: e.target.value });
      renderStep3Results();
    });
  }

  // 14. Selector de Criterio de Ordenamiento
  const sortBySelect = document.getElementById('sort-by-select');
  if (sortBySelect) {
    sortBySelect.value = store.getState().sortBy;
    sortBySelect.addEventListener('change', (e) => {
      store.setState({ sortBy: e.target.value });
      executeSolver();
    });
  }

  // 15. Exportar / Importar Sesión JSON
  document.getElementById('btn-export-session')?.addEventListener('click', () => {
    exportSessionJson(store.getState());
    showToast('Sesión exportada en archivo JSON.', 'success');
  });

  const fileInput = document.getElementById('file-import-session');
  document.getElementById('btn-import-session')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importSessionJson(file);
      store.loadSavedState(imported);
      updateCourseCountBadges();
      renderStep2Editor();
      goToStep(2);
      showToast(`Sesión importada con ${imported.coursesData.length} cursos.`, 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      fileInput.value = '';
    }
  });

  // 16. Atajos de Teclado Globales (Alt+1, Alt+2, Alt+3)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
      e.preventDefault();
      goToStep(parseInt(e.key, 10));
    }
  });
}
