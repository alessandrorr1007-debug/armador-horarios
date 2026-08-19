/* ==========================================================================
   ARMADOR DE HORARIOS INTELIGENTE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Almacenamiento Global de Cursos Cargados
  let coursesData = [];
  let generatedSolutions = [];
  let activeSolutionIndex = 0;
  let workOptimizationActive = true;
  let activeCreditLimit = 0;
  let activeCreditLimitUsed = 0;

  // Mapeo de Días de la Semana
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const DAY_ALIASES = {
    'lun': 0, 'lunes': 0, 'l': 0,
    'mar': 1, 'martes': 1, 'm': 1,
    'mie': 2, 'miercoles': 2, 'miércoles': 2, 'x': 2,
    'jue': 3, 'jueves': 3, 'j': 3,
    'vie': 4, 'viernes': 4, 'v': 4,
    'sab': 5, 'sabado': 5, 'sábado': 5, 's': 5,
    'dom': 6, 'domingo': 6, 'd': 6
  };

  // Paleta de Colores Armoniosa para Cursos en el Calendario
  const COURSE_COLORS = [
    { bg: '#4f46e5', text: '#ffffff' }, // Indigo
    { bg: '#059669', text: '#ffffff' }, // Emerald
    { bg: '#d97706', text: '#ffffff' }, // Amber
    { bg: '#7c3aed', text: '#ffffff' }, // Purple
    { bg: '#0891b2', text: '#ffffff' }, // Cyan
    { bg: '#dc2626', text: '#ffffff' }, // Red
    { bg: '#ea580c', text: '#ffffff' }, // Orange
    { bg: '#be185d', text: '#ffffff' }  // Pink
  ];

  /* --------------------------------------------------------------------------
     1. MANEJO DE INTERFAZ
     -------------------------------------------------------------------------- */
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const apiErrorCard = document.getElementById('api-error-card');
  const apiErrorTitle = document.getElementById('api-error-title');
  const apiErrorDesc = document.getElementById('api-error-desc');
  const textInput = document.getElementById('text-input');
  
  const courseCountBadge = document.getElementById('course-count-badge');
  const courseCountBadgeStep1 = document.getElementById('course-count-badge-step1');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnAddMoreCourses = document.getElementById('btn-add-more-courses');
  const btnViewCoursesList = document.getElementById('btn-view-courses-list');
  const btnOptimizeCompact = document.getElementById('btn-optimize-compact');

  themeToggle?.addEventListener('click', () => {
    const isDark = !document.documentElement.getAttribute('data-theme');
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'light');
      themeIcon.className = 'ri-sun-line';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeIcon.className = 'ri-moon-line';
    }
  });

  btnClearAll?.addEventListener('click', () => {
    if (confirm('¿Estás seguro de vaciar todos los cursos cargados?')) {
      coursesData = [];
      updateCourseCountBadges();
      renderStep2Editor();
      if (textInput) textInput.value = '';
    }
  });

  btnAddMoreCourses?.addEventListener('click', () => goToStep(1));
  btnViewCoursesList?.addEventListener('click', () => goToStep(2));

  btnOptimizeCompact?.addEventListener('click', () => {
    workOptimizationActive = !workOptimizationActive;
    syncOptimizeButton();

    if (generatedSolutions.length > 0) {
      generatedSolutions.sort(compareSolutions);
      activeSolutionIndex = 0;
      renderStep3Results();
    }
  });

  function syncOptimizeButton() {
    if (!btnOptimizeCompact) return;
    if (workOptimizationActive) {
      btnOptimizeCompact.classList.add('active');
      btnOptimizeCompact.innerHTML = '<i class="ri-check-double-line"></i> Optimización Laboral Activa';
    } else {
      btnOptimizeCompact.classList.remove('active');
      btnOptimizeCompact.innerHTML = '<i class="ri-briefcase-4-line"></i> Aplicar Optimización Laboral';
    }
  }
  syncOptimizeButton();

  const creditLimitInput = document.getElementById('credit-limit-input');
  const creditTotalInfo = document.getElementById('credit-total-info');

  creditLimitInput?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value) || 0;
    activeCreditLimit = Math.max(0, val);
  });

  function updateCreditTotalInfo() {
    if (!creditTotalInfo) return;
    const totalCred = coursesData.reduce((sum, c) => sum + (c.creditosCurso || 0), 0);
    creditTotalInfo.textContent = `Total disponibles: ${totalCred} créditos en ${coursesData.length} curso${coursesData.length === 1 ? '' : 's'}`;
  }

  function updateCourseCountBadges() {
    const count = coursesData.length;
    const badgeText = `Cursos cargados: ${count}`;

    if (courseCountBadge) courseCountBadge.textContent = badgeText;
    if (courseCountBadgeStep1) courseCountBadgeStep1.textContent = badgeText;

    if (btnViewCoursesList) {
      btnViewCoursesList.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    updateCreditTotalInfo();
  }

  function hideApiError() {
    if (apiErrorCard) apiErrorCard.style.display = 'none';
  }

  function showApiError(title, message) {
    if (apiErrorCard) {
      apiErrorTitle.textContent = title;
      apiErrorDesc.textContent = message;
      apiErrorCard.style.display = 'flex';
    }
  }

  function goToStep(stepNumber) {
    document.querySelectorAll('.step-card').forEach(card => card.style.display = 'none');
    document.querySelectorAll('.step-item').forEach(item => {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    });

    document.getElementById(`step-${stepNumber}-section`).style.display = 'block';
    document.getElementById(`step-nav-${stepNumber}`).classList.add('active');
    document.getElementById(`step-nav-${stepNumber}`).setAttribute('aria-current', 'step');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('btn-back-to-step1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-edit-courses-again')?.addEventListener('click', () => goToStep(2));


  /* --------------------------------------------------------------------------
     2. PARSER DE TEXTO UNIVERSAL
     -------------------------------------------------------------------------- */
  function parseScheduleText(text) {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n');
    const courseBlocks = [];
    let currentBlockLines = [];

    lines.forEach(line => {
      const isCourseTitleLine = /^[A-Z0-9\s-]+-\s*\(\s*[A-Z0-9_-]+\s*\)/i.test(line.trim())
                             || /^[A-Z0-9_-]{3,}\s*-\s*[A-Z]/i.test(line.trim())
                             || /^\(\s*[A-Z0-9_-]{3,}\s*\)\s*[A-Z]/i.test(line.trim());
      
      if (isCourseTitleLine && currentBlockLines.length > 0 && (currentBlockLines.some(l => l.includes('NRC') || l.includes('Sec')))) {
        courseBlocks.push(currentBlockLines.join('\n'));
        currentBlockLines = [];
      }
      currentBlockLines.push(line);
    });

    if (currentBlockLines.length > 0) {
      courseBlocks.push(currentBlockLines.join('\n'));
    }

    const courses = [];

    courseBlocks.forEach(block => {
      const firstLine = block.split('\n').map(l => l.trim()).find(l => l.length > 0 && !l.startsWith('Sec') && !l.startsWith('NRC') && !l.includes('🟢') && !l.includes('🔴'));

      let courseCode = 'CURSO';
      let courseName = 'Curso Registrado';

      if (firstLine) {
        const codeMatch = firstLine.match(/\(\s*([A-Z0-9_-]+)\s*\)/i) || firstLine.match(/^([A-Z0-9_-]{3,})/i);
        if (codeMatch) courseCode = codeMatch[1].trim();

        courseName = firstLine.replace(/^([A-Z0-9\s-]+-\s*)?(\(\s*[A-Z0-9_-]+\s*\)\s*)?/i, '').trim() || firstLine;
      }

      const sectionChunks = block.split(/(?=(?:NRC:?|Sec\s+[A-Z0-9]+))/i)
        .filter(c => (/NRC/i.test(c) || /Sec\s+[A-Z0-9]+/i.test(c)) && (/\d{1,2}:\d{2}/.test(c) || /ID LIGA|Grupo:/i.test(c)));

      const sections = [];

      sectionChunks.forEach(chunk => {
        const cLines = chunk.split('\n').map(l => l.trim()).filter(l => l !== '');

        const getValueAfter = (label) => {
          const idx = cLines.findIndex(l => l.toUpperCase().startsWith(label.toUpperCase()));
          if (idx === -1) return null;
          const sameLine = cLines[idx].substring(label.length).trim();
          if (sameLine) return sameLine;
          return cLines[idx + 1] ? cLines[idx + 1].trim() : null;
        };

        let nrc = getValueAfter('NRC:');
        let secc = getValueAfter('SECC:');
        let idLiga = getValueAfter('ID LIGA:');
        let liga = getValueAfter('LIGA:');
        let capaRaw = getValueAfter('CAPA:');
        let regiRaw = getValueAfter('REGI:');
        let credRaw = getValueAfter('CRED:');

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
          idLiga = ligaMatch[1];
          liga = ligaMatch[2];
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
        const cred = credRaw ? parseInt(credRaw.replace(/\D/g, '')) || 0 : 0;

        const slots = [];
        let docente = null, aula = null;

        for (let k = 0; k < cLines.length; k++) {
          const dataLine = cLines[k];
          const dayMatch = dataLine.match(/\b(LUN|MAR|MIE|MIERCOLES|MIÉRCOLES|JUE|VIE|SAB|SÁBADO|DOM),?\b/i);
          const timeMatch = dataLine.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*[-aA]\s*(\d{1,2}:\d{2}\s*[AP]M)/i);

          if (dayMatch && timeMatch) {
            const diaStr = dayMatch[1];
            const startStr = timeMatch[1];
            const endStr = timeMatch[2];

            const aulaMatch = dataLine.match(/\b([A-Z]\d{3}|Lab\d*|PAB\d*)\b/i) || dataLine.match(/\((G\d+)\)/i);
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
          const docLine = cLines.find(l => /[A-ZÁÉÍÓÚ]{3,}\s+[A-ZÁÉÍÓÚ]{3,}/i.test(l) && !l.includes('PABE') && !l.includes('PRESENCIAL') && !l.includes('Sec') && !l.includes('NRC') && !l.includes('Cupos'));
          if (docLine) docente = docLine.trim();
        }

        const mainSlot = slots[0] || {};
        sections.push({
          nrc: nrc || Math.random().toString(36).substring(2, 7),
          secc: secc || '01',
          idLiga: idLiga || null,
          liga: liga || null,
          tipoLiga: tipoLiga,
          grupoLiga: grupoLiga,
          aula: mainSlot.aula || aula,
          dia: mainSlot.dia || null,
          horaInicio: mainSlot.horaInicio || null,
          horaFin: mainSlot.horaFin || null,
          docente: docente || 'Docente asignado',
          slots: slots,
          capa: capa ? parseInt(capa) : null,
          regi: regi ? parseInt(regi) : null,
          cred: cred,
          estado: isClosed ? 'CERRADO' : 'ABIERTO',
          incluirEnArmado: !isClosed
        });
      });

      if (sections.length > 0) {
        const creditosCurso = Math.max(...sections.map(s => s.cred || 0));
        courses.push({ codigo: courseCode, nombre: courseName, sections, creditosCurso, obligatorio: false });
      }
    });

    return courses;
  }

  /* --------------------------------------------------------------------------
     3. ACUMULACIÓN DE CURSOS POR `codigo`
     -------------------------------------------------------------------------- */
  const btnProcessInput = document.getElementById('btn-process-input');

  btnProcessInput?.addEventListener('click', () => {
    hideApiError();
    const rawVal = textInput?.value.trim();

    if (!rawVal) {
      showApiError('Campo de texto vacío', 'Por favor pega el texto de tu curso en el área de texto.');
      return;
    }

    const newCourses = parseScheduleText(rawVal);

    if (!newCourses || newCourses.length === 0) {
      showApiError(
        'Formato de curso no reconocido',
        'Por favor asegúrate de copiar el texto completo de la tabla de tu portal académico.'
      );
      return;
    }

    newCourses.forEach(newC => {
      const existingIdx = coursesData.findIndex(c => c.codigo.toUpperCase() === newC.codigo.toUpperCase());
      if (existingIdx !== -1) {
        coursesData[existingIdx] = newC;
      } else {
        coursesData.push(newC);
      }
    });

    if (textInput) textInput.value = '';

    updateCourseCountBadges();
    renderStep2Editor();
    goToStep(2);
  });


  /* --------------------------------------------------------------------------
     4. RENDERIZADO PASO 2
     -------------------------------------------------------------------------- */
  const coursesEditorList = document.getElementById('courses-editor-list');

  function renderStep2Editor() {
    coursesEditorList.innerHTML = '';

    if (coursesData.length === 0) {
      coursesEditorList.innerHTML = '<p class="text-muted">No se han cargado cursos. Haz clic en "Volver al Paso 1" para ingresar tus datos.</p>';
      return;
    }

    coursesData.forEach((course, cIdx) => {
      const card = document.createElement('div');
      card.className = 'course-edit-card';
      
      const fullTitle = `${course.codigo} - ${course.nombre}`;

      card.innerHTML = `
        <div class="course-card-header">
          <div class="course-title-group">
            <input type="text" class="course-title-input" value="${escapeHtml(fullTitle)}" data-cidx="${cIdx}">
            <span class="badge-status badge-lg course-cred-badge">
              ${course.creditosCurso} ${course.creditosCurso === 1 ? 'crédito' : 'créditos'}
            </span>
            <label class="toggle-mandatory-label">
              <input type="checkbox" class="toggle-mandatory-cb" data-cidx="${cIdx}" ${course.obligatorio ? 'checked' : ''}>
              <i class="ri-lock-line"></i> Obligatorio
            </label>
          </div>
          <div class="course-card-actions">
            <button class="btn btn-secondary btn-small btn-danger-ghost btn-del-course" data-cidx="${cIdx}">
              <i class="ri-delete-bin-line"></i> Eliminar Curso
            </button>
          </div>
        </div>
        <div class="section-chips-grid" id="sec-grid-${cIdx}"></div>
      `;

      card.querySelector('.btn-del-course').addEventListener('click', () => {
        coursesData.splice(cIdx, 1);
        updateCourseCountBadges();
        renderStep2Editor();
      });

      card.querySelector('.course-title-input').addEventListener('change', (e) => {
        const parts = e.target.value.split(' - ');
        course.codigo = (parts[0] || course.codigo).trim();
        course.nombre = (parts[1] || course.nombre).trim();
      });

      card.querySelector('.toggle-mandatory-cb').addEventListener('change', (e) => {
        course.obligatorio = e.target.checked;
      });

      const secGrid = card.querySelector(`#sec-grid-${cIdx}`);

      course.sections.forEach((sec, sIdx) => {
        const chip = document.createElement('div');
        const isOriginallyClosed = sec.estado === 'CERRADO';
        const isIncluded = sec.incluirEnArmado === true;

        chip.className = `section-chip ${!isIncluded ? 'chip-closed' : ''}`;

        const secCodeLabel = `Sec ${sec.secc || '01'} (NRC ${sec.nrc || 'N/A'})`;
        const docLabel = sec.docente ? sec.docente : 'Docente asignado';
        
        const ligaBadge = (sec.idLiga || sec.liga)
          ? `<span class="badge-status liga-badge"><i class="ri-links-line"></i> Grupo ${escapeHtml(sec.grupoLiga || '1')}: ${escapeHtml(sec.tipoLiga || 'T')} (${escapeHtml(sec.idLiga || 'N/A')})</span>`
          : '';

        let badgeClass = 'badge-closed';
        let badgeText = 'CERRADO';

        if (isIncluded) {
          badgeClass = 'badge-open';
          badgeText = 'ABIERTO';
        }

        let slotsHtml = '';
        if (sec.slots && sec.slots.length > 0) {
          slotsHtml = sec.slots.map(sl => `
            <li><i class="ri-time-line"></i> <strong>${escapeHtml(sl.dia ? sl.dia.toUpperCase() : 'DÍA')}:</strong> ${escapeHtml(sl.horaInicio)} - ${escapeHtml(sl.horaFin)} (${escapeHtml(sl.aula || 'Aula N/A')})</li>
          `).join('');
        } else {
          const timeLabel = (sec.horaInicio && sec.horaFin) ? `${sec.horaInicio} - ${sec.horaFin}` : 'Horario a consultar';
          const dayLabel = sec.dia ? sec.dia.toUpperCase() : 'DÍA N/A';
          slotsHtml = `<li><i class="ri-time-line"></i> <strong>${escapeHtml(dayLabel)}:</strong> ${escapeHtml(timeLabel)} (${escapeHtml(sec.aula || 'Aula N/A')})</li>`;
        }

        chip.innerHTML = `
          <div class="section-chip-header">
            <div>
              <span class="section-code-badge">${escapeHtml(secCodeLabel)}</span>
              <span class="badge-status ${badgeClass}">
                ${badgeText}
              </span>
              ${ligaBadge}
            </div>
            <button class="btn-icon btn-small btn-icon-danger btn-del-sec" data-cidx="${cIdx}" data-sidx="${sIdx}"><i class="ri-close-line"></i></button>
          </div>

          <p class="section-doc">
            <i class="ri-user-2-line"></i> ${escapeHtml(docLabel)}
          </p>

          <ul class="slot-list">
            ${slotsHtml}
            <li class="slot-meta"><i class="ri-group-line"></i> Cupos: ${sec.regi !== null ? sec.regi : 'N/A'} / ${sec.capa !== null ? sec.capa : 'N/A'}</li>
          </ul>

          <label class="sec-toggle-label">
            <input type="checkbox" class="sec-avail-checkbox" ${isIncluded ? 'checked' : ''} data-cidx="${cIdx}" data-sidx="${sIdx}">
            <span>${isOriginallyClosed ? 'Sección cerrada en portal' : 'Incluir esta sección en el armado'}</span>
          </label>
        `;

        chip.querySelector('.sec-avail-checkbox').addEventListener('change', (e) => {
          sec.incluirEnArmado = e.target.checked;
          chip.classList.toggle('chip-closed', !sec.incluirEnArmado);
          const statusBadge = chip.querySelector('.badge-status');

          if (sec.incluirEnArmado) {
            statusBadge.className = 'badge-status badge-open';
            statusBadge.textContent = 'ABIERTO';
          } else {
            statusBadge.className = 'badge-status badge-closed';
            statusBadge.textContent = 'CERRADO';
          }
        });

        chip.querySelector('.btn-del-sec').addEventListener('click', () => {
          coursesData[cIdx].sections.splice(sIdx, 1);
          renderStep2Editor();
        });

        secGrid.appendChild(chip);
      });

      coursesEditorList.appendChild(card);
    });
  }


  /* --------------------------------------------------------------------------
     5. MOTOR ALGORÍTMICO Y GENERACIÓN DE SOLUCIONES
     -------------------------------------------------------------------------- */
  const btnGenerateSchedule = document.getElementById('btn-generate-schedule');

  btnGenerateSchedule?.addEventListener('click', () => {
    if (coursesData.length === 0) {
      alert('Debes registrar al menos 1 curso para generar el horario.');
      return;
    }

    const creditLimit = activeCreditLimit > 0 ? activeCreditLimit : 0;
    const result = solveSchedulesWithLigas(coursesData, creditLimit);

    if (result && result.error) {
      const errorAlert = document.getElementById('mandatory-error-alert');
      const errorText = document.getElementById('mandatory-error-text');
      if (errorAlert && errorText) {
        if (result.error === 'mandatory_no_sections') {
          errorText.textContent = `Los cursos obligatorios ${result.courses.join(', ')} no tienen secciones válidas disponibles. Revisa en el Paso 2 que tengan al menos 1 sección marcada como incluida.`;
        } else if (result.error === 'mandatory_conflict') {
          errorText.textContent = `Los cursos obligatorios ${result.courses.join(', ')} tienen horarios que se chocan entre sí. No es posible generar un horario con estos cursos obligatorios simultáneamente. Quita la marca de obligatorio de al menos uno o ajusta las secciones.`;
        }
        errorAlert.style.display = 'flex';
        document.getElementById('conflict-alert').style.display = 'none';
      }
      return;
    }

    const solutions = result;

    if (solutions && solutions.length > 0) {
      generatedSolutions = solutions;
      activeSolutionIndex = 0;
      activeCreditLimitUsed = creditLimit;
      document.getElementById('conflict-alert').style.display = 'none';
      const mandatoryError = document.getElementById('mandatory-error-alert');
      if (mandatoryError) mandatoryError.style.display = 'none';
      renderStep3Results();
      goToStep(3);
    } else {
      diagnoseAndReportConflicts();
    }
  });

  function solveSchedulesWithLigas(courses, creditLimit) {
    const useCreditLimit = creditLimit > 0;

    const courseCreditsList = [];
    const courseOptionsList = courses.map((course, idx) => {
      courseCreditsList[idx] = course.creditosCurso || 0;
      const allSections = course.sections;

      // Solo se consideran secciones ABIERTAS y marcadas como incluidas.
      const activeSections = allSections.filter(s => {
        return s.estado !== 'CERRADO' && s.incluirEnArmado === true;
      });
      
      const mappedSections = activeSections.map(s => {
        const slotObjects = (s.slots && s.slots.length > 0) ? s.slots.map(sl => {
          const dayIdx = DAY_ALIASES[sl.dia ? sl.dia.toLowerCase().replace(',', '') : 'lun'] ?? 0;
          const startMin = timeStringToMin(sl.horaInicio || '08:00 AM');
          const endMin = timeStringToMin(sl.horaFin || '10:00 AM');
          return { day: dayIdx, startMin, endMin };
        }) : [{
          day: DAY_ALIASES[s.dia ? s.dia.toLowerCase().replace(',', '') : 'lun'] ?? 0,
          startMin: timeStringToMin(s.horaInicio || '08:00 AM'),
          endMin: timeStringToMin(s.horaFin || '10:00 AM')
        }];

        return {
          courseId: course.codigo,
          courseName: `${course.codigo} - ${course.nombre}`,
          sectionId: s.nrc || Math.random().toString(36).substring(2, 7),
          sectionCode: `Sec ${s.secc || '01'} (NRC ${s.nrc || 'N/A'})`,
          professor: s.docente || 'Docente asignado',
          idLiga: s.idLiga,
          tipoLiga: s.tipoLiga || (s.idLiga ? s.idLiga.charAt(0).toUpperCase() : null),
          grupoLiga: s.grupoLiga || (s.idLiga ? s.idLiga.replace(/\D/g, '') : null),
          courseCredits: course.creditosCurso || 0,
          slots: slotObjects
        };
      });

      const hasLigas = mappedSections.some(s => s.grupoLiga);

      if (!hasLigas) {
        return mappedSections.map(sec => [sec]);
      }

      const groupStructures = {};
      allSections.forEach(s => {
        const gNum = s.grupoLiga || (s.idLiga ? s.idLiga.replace(/\D/g, '') : null);
        const tType = s.tipoLiga || (s.idLiga ? s.idLiga.charAt(0).toUpperCase() : null);
        if (gNum && tType) {
          if (!groupStructures[gNum]) groupStructures[gNum] = new Set();
          groupStructures[gNum].add(tType);
        }
      });

      const activeGroups = {};
      mappedSections.forEach(sec => {
        const gNum = sec.grupoLiga;
        if (!activeGroups[gNum]) activeGroups[gNum] = {};
        const tType = sec.tipoLiga || 'UNICO';
        if (!activeGroups[gNum][tType]) activeGroups[gNum][tType] = [];
        activeGroups[gNum][tType].push(sec);
      });

      const validCourseOptions = [];

      Object.entries(activeGroups).forEach(([gNum, typeMap]) => {
        const requiredTypes = groupStructures[gNum] ? Array.from(groupStructures[gNum]) : Object.keys(typeMap);
        const availableTypes = Object.keys(typeMap);

        const isCompleteGroup = requiredTypes.every(req => availableTypes.includes(req));
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

          for (let candidate of candidateSections) {
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

    if (!useCreditLimit) {
      const courseWithoutOptions = courseOptionsList.findIndex(opts => opts.length === 0);
      if (courseWithoutOptions !== -1) {
        return null;
      }
    }

    const hasMandatory = courses.some(c => c.obligatorio);

    if (!hasMandatory) {
      const validSolutions = [];

      function backtrack(courseIndex, currentSelection, currentCredits, includedIndices) {
        if (courseIndex === courseOptionsList.length) {
          if (currentSelection.length === 0) return;
          if (useCreditLimit && currentCredits > creditLimit) return;

          const solutionMetrics = calculateSolutionMetrics(currentSelection);
          validSolutions.push({
            selection: [...currentSelection],
            score: solutionMetrics.score,
            totalDeadTimeMin: solutionMetrics.totalDeadTimeMin,
            totalDeadTimeHours: solutionMetrics.totalDeadTimeHours,
            totalWeeklyHours: solutionMetrics.totalWeeklyHours,
            activeDaysCount: solutionMetrics.activeDaysCount,
            saturdayWorkConflict: solutionMetrics.saturdayWorkConflict,
            totalCredits: currentCredits,
            includedCourseIds: [...includedIndices]
          });
          return;
        }

        const optionsForCourse = courseOptionsList[courseIndex];

        if (useCreditLimit) {
          backtrack(courseIndex + 1, currentSelection, currentCredits, includedIndices);
        }

        if (optionsForCourse.length === 0) return;
        const courseCreds = courseCreditsList[courseIndex] || 0;

        for (let optionGroup of optionsForCourse) {
          if (useCreditLimit && currentCredits + courseCreds > creditLimit) continue;
          if (!hasOverlapWithSelection(optionGroup, currentSelection)) {
            optionGroup.forEach(sec => currentSelection.push(sec));
            backtrack(courseIndex + 1, currentSelection, currentCredits + courseCreds, [...includedIndices, courseIndex]);
            optionGroup.forEach(() => currentSelection.pop());
          }
        }
      }

      backtrack(0, [], 0, []);

      if (validSolutions.length === 0) return null;

      validSolutions.sort(compareSolutions);
      return validSolutions;
    }

    const mandatoryIndices = [];
    const optionalIndices = [];
    courses.forEach((c, i) => {
      if (c.obligatorio) mandatoryIndices.push(i);
      else optionalIndices.push(i);
    });

    const mandatoryNoSections = mandatoryIndices.filter(i => courseOptionsList[i].length === 0);
    if (mandatoryNoSections.length > 0) {
      return { error: 'mandatory_no_sections', courses: mandatoryNoSections.map(i => courses[i].codigo) };
    }

    const mandatoryCombos = [];

    function backtrackMandatory(idx, currentSelection, currentCredits, includedIndices) {
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

      for (let optionGroup of optionsForCourse) {
        if (!hasOverlapWithSelection(optionGroup, currentSelection)) {
          optionGroup.forEach(sec => currentSelection.push(sec));
          backtrackMandatory(idx + 1, currentSelection, currentCredits + courseCreds, [...includedIndices, courseIdx]);
          optionGroup.forEach(() => currentSelection.pop());
        }
      }
    }

    backtrackMandatory(0, [], 0, []);

    if (mandatoryCombos.length === 0) {
      return { error: 'mandatory_conflict', courses: mandatoryIndices.map(i => courses[i].codigo) };
    }

    let bestMandatory = mandatoryCombos[0];
    let bestMandatoryMetrics = calculateSolutionMetrics(bestMandatory.selection);
    for (let i = 1; i < mandatoryCombos.length; i++) {
      const metrics = calculateSolutionMetrics(mandatoryCombos[i].selection);
      if (metrics.totalDeadTimeMin < bestMandatoryMetrics.totalDeadTimeMin) {
        bestMandatory = mandatoryCombos[i];
        bestMandatoryMetrics = metrics;
      }
    }

    const mandatoryCredits = bestMandatory.totalCredits;
    const exceedsWarning = useCreditLimit && mandatoryCredits > creditLimit;
    const remainingBudget = useCreditLimit ? Math.max(0, creditLimit - mandatoryCredits) : Infinity;

    const validSolutions = [];

    function backtrackOptional(idx, currentSelection, currentCredits, includedIndices) {
      if (idx === optionalIndices.length) {
        const totalCredits = mandatoryCredits + currentCredits;
        if (useCreditLimit && totalCredits > creditLimit) return;

        const mergedSelection = [...bestMandatory.selection, ...currentSelection];
        const solutionMetrics = calculateSolutionMetrics(mergedSelection);
        validSolutions.push({
          selection: mergedSelection,
          score: solutionMetrics.score,
          totalDeadTimeMin: solutionMetrics.totalDeadTimeMin,
          totalDeadTimeHours: solutionMetrics.totalDeadTimeHours,
          totalWeeklyHours: solutionMetrics.totalWeeklyHours,
          activeDaysCount: solutionMetrics.activeDaysCount,
          saturdayWorkConflict: solutionMetrics.saturdayWorkConflict,
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

      for (let optionGroup of optionsForCourse) {
        if (useCreditLimit && currentCredits + courseCreds > remainingBudget) continue;
        if (!hasOverlapWithSelection(optionGroup, [...bestMandatory.selection, ...currentSelection])) {
          optionGroup.forEach(sec => currentSelection.push(sec));
          backtrackOptional(idx + 1, currentSelection, currentCredits + courseCreds, [...includedIndices, courseIdx]);
          optionGroup.forEach(() => currentSelection.pop());
        }
      }
    }

    backtrackOptional(0, [], 0, []);

    if (validSolutions.length === 0) return null;

    validSolutions.sort(compareSolutions);
    return validSolutions;
  }

  function compareSolutions(a, b) {
    if (workOptimizationActive) {
      if (a.saturdayWorkConflict !== b.saturdayWorkConflict) {
        return a.saturdayWorkConflict ? 1 : -1;
      }
    }

    // Cuando hay límite de créditos activo, priorizar la combinación más cercana al límite
    if (activeCreditLimitUsed > 0) {
      const limit = activeCreditLimitUsed;
      const gapA = limit - (a.totalCredits || 0);
      const gapB = limit - (b.totalCredits || 0);
      if (gapA !== gapB) return gapA - gapB;
    }

    const diffDeadTime = a.totalDeadTimeMin - b.totalDeadTimeMin;

    if (Math.abs(diffDeadTime) < 30) {
      if (a.activeDaysCount !== b.activeDaysCount) {
        return a.activeDaysCount - b.activeDaysCount;
      }
    }

    return diffDeadTime;
  }

  function hasInternalOverlap(targetSection, currentCombo) {
    for (let sec of currentCombo) {
      for (let slotA of targetSection.slots) {
        for (let slotB of sec.slots) {
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

  function hasOverlapWithSelection(optionGroup, selectedSections) {
    for (let targetSection of optionGroup) {
      for (let selected of selectedSections) {
        for (let slotA of targetSection.slots) {
          for (let slotB of selected.slots) {
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

  function calculateSolutionMetrics(selection) {
    let totalWeeklyMin = 0;
    let totalDeadTimeMin = 0;
    let activeDays = new Set();
    let saturdayWorkConflict = false;

    const dayClassesMap = {};
    for (let i = 0; i < 7; i++) dayClassesMap[i] = [];

    selection.forEach(item => {
      item.slots.forEach(slot => {
        totalWeeklyMin += (slot.endMin - slot.startMin);
        activeDays.add(slot.day);
        dayClassesMap[slot.day].push({ start: slot.startMin, end: slot.endMin });

        if (slot.day === 5 && slot.startMin < 930) {
          saturdayWorkConflict = true;
        }
      });
    });

    Object.keys(dayClassesMap).forEach(day => {
      const classes = dayClassesMap[day];
      if (classes.length > 1) {
        classes.sort((a, b) => a.start - b.start);
        for (let k = 0; k < classes.length - 1; k++) {
          const gapMin = classes[k + 1].start - classes[k].end;
          if (gapMin > 5) {
            totalDeadTimeMin += gapMin;
          }
        }
      }
    });

    const totalDeadTimeHours = (totalDeadTimeMin / 60);
    const totalWeeklyHours = (totalWeeklyMin / 60);
    const activeDaysCount = activeDays.size;

    let score = 1000000;
    if (saturdayWorkConflict) score -= 500000;
    score -= (totalDeadTimeMin * 100);
    score -= (activeDaysCount * 1000);

    return {
      score,
      totalDeadTimeMin,
      totalDeadTimeHours,
      totalWeeklyHours,
      activeDaysCount,
      saturdayWorkConflict
    };
  }

  function diagnoseAndReportConflicts() {
    const conflictAlert = document.getElementById('conflict-alert');
    const creditSummary = document.getElementById('credit-summary');
    if (creditSummary) creditSummary.style.display = 'none';
    const conflictList = document.getElementById('conflict-list');
    conflictList.innerHTML = '';

    const conflictPairs = [];

    coursesData.forEach(c => {
      const openSecs = c.sections.filter(s => s.incluirEnArmado === true && s.estado !== 'CERRADO');
      if (openSecs.length === 0) {
        conflictPairs.push(`El curso "${c.codigo} - ${c.nombre}" no tiene ninguna sección abierta disponible (NRC cerrado o sin vacante).`);
      }
    });

    if (conflictPairs.length === 0) {
      conflictPairs.push('Se detectó un cruce de horarios o falta de grupo de ligas completo entre los cursos. Intenta activar otra sección en el Paso 2.');
    }

    conflictPairs.forEach(msg => {
      const li = document.createElement('li');
      li.textContent = msg;
      conflictList.appendChild(li);
    });

    conflictAlert.style.display = 'flex';
    goToStep(3);
  }


  /* --------------------------------------------------------------------------
     6. RENDERIZADO DE CUADRÍCULA UPAO
     -------------------------------------------------------------------------- */
  const timetableGrid = document.getElementById('timetable-grid');
  const solutionsPills = document.getElementById('solutions-pills');
  const solutionsBar = document.getElementById('solutions-selector-bar');
  const timetableLegend = document.getElementById('timetable-legend');

  function renderStep3Results() {
    if (generatedSolutions.length === 0) return;

    if (generatedSolutions.length > 1) {
      solutionsBar.style.display = 'flex';
      solutionsPills.innerHTML = '';
      generatedSolutions.slice(0, 5).forEach((sol, idx) => {
        const pill = document.createElement('button');
        pill.className = `sol-pill ${idx === activeSolutionIndex ? 'active' : ''}`;
        
        let labelExtra = '';
        const credLabel = activeCreditLimitUsed > 0 ? ` · ${(sol.totalCredits || 0)}cr` : '';
        if (sol.saturdayWorkConflict) {
          labelExtra = `${credLabel} · Incluye Sábado`;
        } else if (sol.totalDeadTimeMin === 0) {
          labelExtra = `${credLabel} · 0h tiempo muerto`;
        } else {
          labelExtra = `${credLabel} · ${sol.totalDeadTimeHours.toFixed(1)}h tiempo muerto · ${sol.activeDaysCount}d`;
        }

        const includedCount = (sol.includedCourseIds || []).length;
        pill.innerHTML = `Opción ${idx + 1} (${includedCount} curso${includedCount === 1 ? '' : 's'})${labelExtra}`;
        pill.addEventListener('click', () => {
          activeSolutionIndex = idx;
          renderStep3Results();
        });
        solutionsPills.appendChild(pill);
      });
    } else {
      solutionsBar.style.display = 'none';
    }

    const currentSol = generatedSolutions[activeSolutionIndex];

    const totalCursosCargados = coursesData.length;
    const totalCursosIncluidos = currentSol.selection.length;
    document.getElementById('metric-total-courses').textContent = `${totalCursosIncluidos}${activeCreditLimitUsed > 0 ? '/' + totalCursosCargados : ''}`;
    document.getElementById('metric-weekly-hours').textContent = `${currentSol.totalWeeklyHours.toFixed(1)}h`;
    document.getElementById('metric-gap-hours').textContent = `${currentSol.totalDeadTimeHours.toFixed(1)}h`;
    
    const efficiencyPct = Math.max(0, Math.min(100, Math.round(100 - (currentSol.totalDeadTimeHours * 5))));
    document.getElementById('metric-efficiency').textContent = `${efficiencyPct}%`;

    // Resumen de créditos
    const creditSummary = document.getElementById('credit-summary');
    const creditSummaryText = document.getElementById('credit-summary-text');
    const creditExcludedText = document.getElementById('credit-excluded-text');

    if (activeCreditLimitUsed > 0 && creditSummary) {
      creditSummary.style.display = 'block';
      const usedCredits = currentSol.totalCredits || 0;

      if (currentSol.exceedsWarning) {
        creditSummaryText.textContent = `⚠ Los cursos obligatorios exceden el límite: ${usedCredits} / ${activeCreditLimitUsed} créditos`;
      } else {
        creditSummaryText.textContent = `Créditos utilizados: ${usedCredits} / ${activeCreditLimitUsed} créditos máximos`;
      }

      const includedIds = new Set(currentSol.includedCourseIds || []);
      const hasMandatory = coursesData.some(c => c.obligatorio);

      if (hasMandatory) {
        const mandatoryIncluded = coursesData.filter((c, idx) => c.obligatorio && includedIds.has(idx));
        const optionalIncluded = coursesData.filter((c, idx) => !c.obligatorio && includedIds.has(idx));
        const optionalExcluded = coursesData.filter((c, idx) => !c.obligatorio && !includedIds.has(idx));

        let parts = [];
        if (mandatoryIncluded.length > 0) {
          parts.push(`Obligatorios (${mandatoryIncluded.length}): ${mandatoryIncluded.map(c => `${c.codigo} (${c.creditosCurso || 0}cr)`).join(', ')}`);
        }
        if (optionalIncluded.length > 0) {
          parts.push(`Opcionales incluidos (${optionalIncluded.length}): ${optionalIncluded.map(c => `${c.codigo} (${c.creditosCurso || 0}cr)`).join(', ')}`);
        }
        if (optionalExcluded.length > 0) {
          parts.push(`Opcionales excluidos (${optionalExcluded.length}): ${optionalExcluded.map(c => `${c.codigo} (${c.creditosCurso || 0}cr)`).join(', ')}`);
        }

        creditExcludedText.textContent = parts.join(' · ');
      } else {
        const excludedCourses = coursesData.filter((c, idx) => !includedIds.has(idx));
        if (excludedCourses.length > 0) {
          const excludedNames = excludedCourses.map(c => `${c.codigo} (${c.creditosCurso || 0}cr)`).join(', ');
          creditExcludedText.textContent = `No se pudieron incluir todos los cursos para respetar tu límite de ${activeCreditLimitUsed} créditos. Cursos excluidos: ${excludedNames}`;
        } else {
          creditExcludedText.textContent = '';
        }
      }
    } else if (creditSummary) {
      creditSummary.style.display = 'none';
    }

    const courseColorMap = {};
    coursesData.forEach((c, idx) => {
      courseColorMap[c.codigo] = COURSE_COLORS[idx % COURSE_COLORS.length];
    });

    timetableLegend.innerHTML = currentSol.selection.map(item => `
      <div class="legend-item">
        <span class="legend-dot" style="background: ${courseColorMap[item.courseId] ? courseColorMap[item.courseId].bg : '#4f46e5'}"></span>
        <span><strong>${escapeHtml(item.courseName)}</strong> (${escapeHtml(item.sectionCode)})</span>
      </div>
    `).join('');

    timetableGrid.innerHTML = '';

    const hasSunday = currentSol.selection.some(item => item.slots.some(slot => slot.day === 6));
    const activeDaysList = hasSunday ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const numDays = activeDaysList.length;

    // LISTA FIJA Y HARDCODEADA DE BLOQUES REALES UPAO
    const UPAO_ROW_BOUNDARIES = [
      { startMin: 420,  endMin: 530,  label: '07:00 AM', durationMin: 110 }, // 07:00 - 08:50 (1h 50m)
      { startMin: 530,  endMin: 640,  label: '08:50 AM', durationMin: 110 }, // 08:50 - 10:40 (1h 50m)
      { startMin: 640,  endMin: 745,  label: '10:40 AM', durationMin: 105 }, // 10:40 - 12:25 (1h 45m)
      { startMin: 745,  endMin: 860,  label: '12:25 PM', durationMin: 115 }, // 12:25 - 02:20 (1h 55m almuerzo/tarde)
      { startMin: 860,  endMin: 970,  label: '02:20 PM', durationMin: 110 }, // 02:20 - 04:10 (1h 50m)
      { startMin: 970,  endMin: 1080, label: '04:10 PM', durationMin: 110 }, // 04:10 - 06:00 (1h 50m)
      { startMin: 1080, endMin: 1190, label: '06:00 PM', durationMin: 110 }, // 06:00 - 07:50 (1h 50m)
      { startMin: 1190, endMin: 1295, label: '07:50 PM', durationMin: 105 }  // 07:50 - 09:35 (1h 45m)
    ];

    const BASE_MIN = 420; // 07:00 AM
    const MAX_MIN = 1295; // 09:35 PM
    const TOTAL_MIN = MAX_MIN - BASE_MIN; // 875 minutos totales

    const PX_PER_MIN = 1.2;
    const totalHeightPx = TOTAL_MIN * PX_PER_MIN;

    timetableGrid.style.gridTemplateColumns = `85px repeat(${numDays}, minmax(130px, 1fr))`;

    // 1. Esquina superior "Hora"
    const cornerCell = document.createElement('div');
    cornerCell.className = 'time-header-cell';
    cornerCell.textContent = 'Hora';
    timetableGrid.appendChild(cornerCell);

    // 2. Encabezados de días
    activeDaysList.forEach(dayName => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header-cell';
      dayHeader.textContent = dayName;
      timetableGrid.appendChild(dayHeader);
    });

    // 3. Columna izquierda con ETIQUETAS CENTRADAS VERTICALMENTE EN SU CELDA (AJUSTE VISUAL 2)
    const timeCol = document.createElement('div');
    timeCol.className = 'time-labels-column';
    timeCol.style.position = 'relative';
    timeCol.style.height = `${totalHeightPx}px`;

    UPAO_ROW_BOUNDARIES.forEach(row => {
      const topPx = (row.startMin - BASE_MIN) * PX_PER_MIN;
      const heightPx = row.durationMin * PX_PER_MIN;

      const rowLabel = document.createElement('div');
      rowLabel.className = 'time-fixed-row';
      rowLabel.style.top = `${topPx}px`;
      rowLabel.style.height = `${heightPx}px`;
      rowLabel.textContent = row.label;
      timeCol.appendChild(rowLabel);
    });
    timetableGrid.appendChild(timeCol);

    // 4. Columnas de Días con LÍNEAS VERTICALES ENTRE DÍAS (AJUSTE VISUAL 1) y Bloques Exactos
    for (let d = 0; d < numDays; d++) {
      const dayCol = document.createElement('div');
      dayCol.className = 'day-column-body';
      dayCol.style.position = 'relative';
      dayCol.style.height = `${totalHeightPx}px`;

      // Renderizar líneas horizontales en el inicio de cada bloque fijo UPAO
      UPAO_ROW_BOUNDARIES.forEach(row => {
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

      // Renderizar bloques de clase cayendo exactamente dentro de su celda/rango UPAO correspondiente
      currentSol.selection.forEach(item => {
        item.slots.forEach(slot => {
          if (slot.day === d) {
            const topPx = (slot.startMin - BASE_MIN) * PX_PER_MIN;
            const durationMin = slot.endMin - slot.startMin;
            const heightPx = durationMin * PX_PER_MIN;

            const eventBlock = document.createElement('div');
            eventBlock.className = 'event-block';
            eventBlock.style.background = courseColorMap[item.courseId] ? courseColorMap[item.courseId].bg : '#4f46e5';
            eventBlock.style.top = `${topPx}px`;
            eventBlock.style.height = `${Math.max(22, heightPx - 1)}px`;

            eventBlock.innerHTML = `
              <span class="event-title">${escapeHtml(item.courseName)}</span>
              <span class="event-section">${escapeHtml(item.sectionCode)}</span>
              <span class="event-time">${formatTime(slot.startMin)} - ${formatTime(slot.endMin)}</span>
            `;

            dayCol.appendChild(eventBlock);
          }
        });
      });

      timetableGrid.appendChild(dayCol);
    }
  }


  /* --------------------------------------------------------------------------
     7. EXPORTACIÓN A IMAGEN (PNG)
     -------------------------------------------------------------------------- */
  const btnExportImage = document.getElementById('btn-export-image');

  btnExportImage?.addEventListener('click', async () => {
    const timetableWrapper = document.getElementById('timetable-wrapper');

    if (typeof html2canvas === 'undefined') {
      alert('La librería de exportación no se cargó correctamente.');
      return;
    }

    try {
      btnExportImage.disabled = true;
      btnExportImage.innerHTML = '<div class="spinner" style="width: 16px; height: 16px;"></div> Generando Imagen...';

      const canvas = await html2canvas(timetableWrapper, {
        scale: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#131b2e',
        useCORS: true
      });

      const imageURI = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Horario_Optimizado_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = imageURI;
      link.click();

      btnExportImage.disabled = false;
      btnExportImage.innerHTML = '<i class="ri-download-2-line"></i> Descargar Horario (PNG)';
    } catch (err) {
      alert('Error al exportar la imagen.');
      btnExportImage.disabled = false;
      btnExportImage.innerHTML = '<i class="ri-download-2-line"></i> Descargar Horario (PNG)';
    }
  });


  /* --------------------------------------------------------------------------
     8. UTILIDADES
     -------------------------------------------------------------------------- */
  function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  function timeStringToMin(timeStr) {
    if (!timeStr) return 0;
    const clean = String(timeStr).trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');

    let [hStr, mStr] = clean.replace(/[^\d:]/g, '').split(':');
    let h = parseInt(hStr || '0', 10);
    let m = parseInt(mStr || '0', 10);

    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;

    return h * 60 + m;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, match => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[match];
    });
  }

});
