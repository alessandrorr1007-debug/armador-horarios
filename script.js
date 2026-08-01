/* ==========================================================================
   ARMADOR DE HORARIOS INTELIGENTE - MOTOR CON LIGAS DE GRUPO (T + L)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // Almacenamiento Global de Cursos Cargados
  let coursesData = [];
  let generatedSolutions = [];
  let activeSolutionIndex = 0;
  let workOptimizationActive = true; // Activo por defecto para priorizar trabajo

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
    if (workOptimizationActive) {
      btnOptimizeCompact.classList.add('active');
      btnOptimizeCompact.innerHTML = '<i class="ri-check-double-line"></i> ⚡ Optimización Laboral Activa';
    } else {
      btnOptimizeCompact.classList.remove('active');
      btnOptimizeCompact.innerHTML = '<i class="ri-briefcase-4-line"></i> ⚡ Aplicar Optimización Laboral';
    }

    if (generatedSolutions.length > 0) {
      generatedSolutions.sort((a, b) => workOptimizationActive ? (b.score - a.score) : (a.totalGapHours - b.totalGapHours));
      activeSolutionIndex = 0;
      renderStep3Results();
    }
  });

  function updateCourseCountBadges() {
    const count = coursesData.length;
    const badgeText = `Cursos cargados: ${count}`;

    if (courseCountBadge) courseCountBadge.textContent = badgeText;
    if (courseCountBadgeStep1) courseCountBadgeStep1.textContent = badgeText;

    if (btnViewCoursesList) {
      btnViewCoursesList.style.display = count > 0 ? 'inline-flex' : 'none';
    }
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
    document.querySelectorAll('.step-item').forEach(item => item.classList.remove('active'));

    document.getElementById(`step-${stepNumber}-section`).style.display = 'block';
    document.getElementById(`step-nav-${stepNumber}`).classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('btn-back-to-step1')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-edit-courses-again')?.addEventListener('click', () => goToStep(2));


  /* --------------------------------------------------------------------------
     2. PARSER DE TEXTO UNIVERSAL (CON tipoLiga Y grupoLiga)
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

        // TAREA 1: Extraer tipoLiga ('T' o 'L') y grupoLiga (número al final de ID LIGA)
        let tipoLiga = null;
        let grupoLiga = null;
        if (idLiga) {
          tipoLiga = idLiga.charAt(0).toUpperCase();
          grupoLiga = idLiga.replace(/\D/g, '');
        }

        const isClosed = /CERRADO|🔴/i.test(chunk);
        const capa = capaRaw ? capaRaw.replace(/\D/g, '') : null;
        const regi = regiRaw ? regiRaw.replace(/CERRADO/i, '').trim().replace(/\D/g, '') : null;

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
          estado: isClosed ? 'CERRADO' : 'ABIERTO',
          incluirEnArmado: !isClosed
        });
      });

      if (sections.length > 0) {
        courses.push({ codigo: courseCode, nombre: courseName, sections });
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
        console.log(`🔄 Curso ${newC.codigo} actualizado en la lista global.`);
      } else {
        coursesData.push(newC);
        console.log(`➕ Curso ${newC.codigo} agregado a la lista global.`);
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
          <input type="text" class="course-title-input" value="${escapeHtml(fullTitle)}" data-cidx="${cIdx}">
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-small btn-del-course" data-cidx="${cIdx}" style="color: var(--danger);">
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

      const secGrid = card.querySelector(`#sec-grid-${cIdx}`);

      course.sections.forEach((sec, sIdx) => {
        const chip = document.createElement('div');
        const isClosed = sec.estado === 'CERRADO' || sec.incluirEnArmado === false;
        chip.className = `section-chip ${isClosed ? 'chip-closed' : ''}`;

        const secCodeLabel = `Sec ${sec.secc || '01'} (NRC ${sec.nrc || 'N/A'})`;
        const docLabel = sec.docente ? sec.docente : 'Docente asignado';
        
        const ligaBadge = (sec.idLiga || sec.liga)
          ? `<span class="badge-status" style="background: rgba(99,102,241,0.15); color: #818cf8; font-size: 0.75rem; margin-left: 0.3rem;"><i class="ri-links-line"></i> Grupo ${escapeHtml(sec.grupoLiga || '1')}: ${escapeHtml(sec.tipoLiga || 'T')} (${escapeHtml(sec.idLiga || 'N/A')})</span>`
          : '';

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
              <span class="badge-status ${isClosed ? 'badge-closed' : 'badge-open'}">
                ${isClosed ? '🔴 CERRADO' : '🟢 ABIERTO'}
              </span>
              ${ligaBadge}
            </div>
            <button class="btn-icon btn-small btn-del-sec" data-cidx="${cIdx}" data-sidx="${sIdx}" style="color: var(--danger);"><i class="ri-close-line"></i></button>
          </div>

          <p style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.3rem;">
            <i class="ri-user-2-line"></i> ${escapeHtml(docLabel)}
          </p>

          <ul class="slot-list">
            ${slotsHtml}
            <li style="font-size: 0.75rem; color: var(--text-muted);"><i class="ri-group-line"></i> Cupos: ${sec.regi !== null ? sec.regi : 'N/A'} / ${sec.capa !== null ? sec.capa : 'N/A'}</li>
          </ul>

          <label class="sec-toggle-label">
            <input type="checkbox" class="sec-avail-checkbox" ${sec.incluirEnArmado ? 'checked' : ''} data-cidx="${cIdx}" data-sidx="${sIdx}">
            <span>Incluir esta sección en el armado</span>
          </label>
        `;

        chip.querySelector('.sec-avail-checkbox').addEventListener('change', (e) => {
          sec.incluirEnArmado = e.target.checked;
          sec.estado = sec.incluirEnArmado ? 'ABIERTO' : 'CERRADO';
          chip.classList.toggle('chip-closed', !sec.incluirEnArmado);
          chip.querySelector('.badge-status').className = `badge-status ${sec.incluirEnArmado ? 'badge-open' : 'badge-closed'}`;
          chip.querySelector('.badge-status').textContent = sec.incluirEnArmado ? '🟢 ABIERTO' : '🔴 CERRADO';
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
     5. MOTOR ALGORÍTMICO POR GRUPOS LIGADOS (TAREAS 2, 3, 4 y 6)
     -------------------------------------------------------------------------- */
  const btnGenerateSchedule = document.getElementById('btn-generate-schedule');

  btnGenerateSchedule?.addEventListener('click', () => {
    if (coursesData.length === 0) {
      alert('Debes registrar al menos 1 curso para generar el horario.');
      return;
    }

    const solutions = solveSchedulesWithLigas(coursesData);

    if (solutions.length > 0) {
      generatedSolutions = solutions;
      activeSolutionIndex = 0;
      document.getElementById('conflict-alert').style.display = 'none';
      renderStep3Results();
      goToStep(3);
    } else {
      diagnoseAndReportConflicts();
    }
  });

  function solveSchedulesWithLigas(courses) {
    const courseOptionsList = courses.map(course => {
      const allSections = course.sections;
      // TAREA 5: Filtrar secciones abiertas e incluidas
      const activeSections = allSections.filter(s => s.incluirEnArmado !== false && s.estado !== 'CERRADO');
      
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
          slots: slotObjects
        };
      });

      // TAREA 4: Si un curso no tiene ningún campo ID LIGA, se trata como secciones sueltas
      const hasLigas = mappedSections.some(s => s.grupoLiga);

      if (!hasLigas) {
        return mappedSections.map(sec => [sec]);
      }

      // TAREA 2: Agrupar todas las secciones del curso por grupoLiga y por tipoLiga ('T' o 'L')
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

      // TAREA 3: Armar combinaciones para cada grupo completo (1 opción T + 1 opción L de dicho grupo)
      Object.entries(activeGroups).forEach(([gNum, typeMap]) => {
        const requiredTypes = groupStructures[gNum] ? Array.from(groupStructures[gNum]) : Object.keys(typeMap);
        const availableTypes = Object.keys(typeMap);

        const isCompleteGroup = requiredTypes.every(req => availableTypes.includes(req));
        if (!isCompleteGroup) {
          console.warn(`⚠️ Grupo ${gNum} descartado por faltar componentes abiertos (ej. Práctica cerrada).`);
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
    }).filter(opts => opts.length > 0);

    const validSolutions = [];

    // TAREA 6: Backtracking reserva simultáneamente la sección T Y la sección L del grupo elegido
    function backtrack(courseIndex, currentSelection) {
      if (courseIndex === courseOptionsList.length) {
        const solutionMetrics = calculateSolutionMetrics(currentSelection);
        validSolutions.push({
          selection: [...currentSelection],
          score: solutionMetrics.score,
          totalGapHours: solutionMetrics.totalGapHours,
          totalWeeklyHours: solutionMetrics.totalWeeklyHours,
          saturdayWorkConflict: solutionMetrics.saturdayWorkConflict
        });
        return;
      }

      const optionsForCourse = courseOptionsList[courseIndex];

      for (let optionGroup of optionsForCourse) {
        if (!hasOverlapWithSelection(optionGroup, currentSelection)) {
          optionGroup.forEach(sec => currentSelection.push(sec));
          backtrack(courseIndex + 1, currentSelection);
          optionGroup.forEach(() => currentSelection.pop());
        }
      }
    }

    backtrack(0, []);
    validSolutions.sort((a, b) => b.score - a.score);
    return validSolutions;
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

  /* --------------------------------------------------------------------------
     MÉTRICAS Y SCORING DE OPTIMIZACIÓN LABORAL
     -------------------------------------------------------------------------- */
  function calculateSolutionMetrics(selection) {
    let totalWeeklyMin = 0;
    let totalGapMin = 0;
    let activeDays = new Set();
    let saturdayWorkConflict = false;
    let saturdayMinutes = 0;

    const dayClassesMap = {};
    for (let i = 0; i < 7; i++) dayClassesMap[i] = [];

    selection.forEach(item => {
      item.slots.forEach(slot => {
        totalWeeklyMin += (slot.endMin - slot.startMin);
        activeDays.add(slot.day);
        dayClassesMap[slot.day].push({ start: slot.startMin, end: slot.endMin });

        if (slot.day === 5) {
          saturdayMinutes += (slot.endMin - slot.startMin);
          if (slot.startMin < 930) {
            saturdayWorkConflict = true;
          }
        }
      });
    });

    Object.keys(dayClassesMap).forEach(day => {
      const classes = dayClassesMap[day];
      if (classes.length > 1) {
        classes.sort((a, b) => a.start - b.start);
        for (let k = 0; k < classes.length - 1; k++) {
          const gap = classes[k + 1].start - classes[k].end;
          if (gap > 0) totalGapMin += gap;
        }
      }
    });

    const totalGapHours = (totalGapMin / 60);
    const totalWeeklyHours = (totalWeeklyMin / 60);

    let score = 10000;
    if (saturdayWorkConflict) score -= 6000;
    if (saturdayMinutes > 0) score -= (saturdayMinutes * 3);
    score -= (totalGapMin * 10);
    score -= (activeDays.size * 50);

    return { score, totalGapHours, totalWeeklyHours, saturdayWorkConflict, saturdayMinutes };
  }

  function diagnoseAndReportConflicts() {
    const conflictAlert = document.getElementById('conflict-alert');
    const conflictList = document.getElementById('conflict-list');
    conflictList.innerHTML = '';

    const conflictPairs = [];

    coursesData.forEach(c => {
      const openSecs = c.sections.filter(s => s.incluirEnArmado !== false && s.estado !== 'CERRADO');
      if (openSecs.length === 0) {
        conflictPairs.push(`El curso "${c.codigo} - ${c.nombre}" no tiene ninguna sección o grupo de ligas abiertas.`);
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
     6. RENDERIZADO DEL CALENDARIO VISUAL ADAPTATIVO
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
        if (sol.saturdayWorkConflict) {
          labelExtra = ' (⚠️ Sábado)';
        } else {
          labelExtra = ` (${sol.totalGapHours.toFixed(1)}h huecos)`;
        }

        pill.innerHTML = `Opción ${idx + 1}${labelExtra}`;
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

    document.getElementById('metric-total-courses').textContent = coursesData.length;
    document.getElementById('metric-weekly-hours').textContent = `${currentSol.totalWeeklyHours.toFixed(1)}h`;
    document.getElementById('metric-gap-hours').textContent = `${currentSol.totalGapHours.toFixed(1)}h`;
    
    const efficiencyPct = Math.max(0, Math.min(100, Math.round(100 - (currentSol.totalGapHours * 5))));
    document.getElementById('metric-efficiency').textContent = `${efficiencyPct}%`;

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

    let minStartHour = 7;
    let maxEndHour = 22;

    currentSol.selection.forEach(item => {
      item.slots.forEach(slot => {
        const startH = Math.floor(slot.startMin / 60);
        const endH = Math.ceil(slot.endMin / 60);
        if (startH < minStartHour) minStartHour = Math.max(6, startH);
        if (endH > maxEndHour) maxEndHour = Math.min(23, endH);
      });
    });

    timetableGrid.style.gridTemplateColumns = `70px repeat(${numDays}, minmax(130px, 1fr))`;

    const cornerCell = document.createElement('div');
    cornerCell.className = 'time-header-cell';
    cornerCell.textContent = 'Hora';
    timetableGrid.appendChild(cornerCell);

    activeDaysList.forEach(dayName => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header-cell';
      dayHeader.textContent = dayName;
      timetableGrid.appendChild(dayHeader);
    });

    for (let h = minStartHour; h < maxEndHour; h++) {
      const timeCell = document.createElement('div');
      timeCell.className = 'time-header-cell';
      timeCell.textContent = `${String(h).padStart(2, '0')}:00`;
      timetableGrid.appendChild(timeCell);

      for (let d = 0; d < numDays; d++) {
        const slotCell = document.createElement('div');
        slotCell.className = 'time-slot-cell';

        currentSol.selection.forEach(item => {
          item.slots.forEach(slot => {
            if (slot.day === d) {
              const startH = Math.floor(slot.startMin / 60);
              if (startH === h) {
                const durationMin = slot.endMin - slot.startMin;
                const topOffsetPct = ((slot.startMin % 60) / 60) * 100;
                const heightPx = (durationMin / 60) * 52;

                const eventBlock = document.createElement('div');
                eventBlock.className = 'event-block';
                eventBlock.style.background = courseColorMap[item.courseId] ? courseColorMap[item.courseId].bg : '#4f46e5';
                eventBlock.style.top = `${topOffsetPct}%`;
                eventBlock.style.height = `${heightPx}px`;

                eventBlock.innerHTML = `
                  <span class="event-title">${escapeHtml(item.courseName)}</span>
                  <span class="event-section">${escapeHtml(item.sectionCode)}</span>
                  <span class="event-time">${formatTime(slot.startMin)} - ${formatTime(slot.endMin)}</span>
                `;

                slotCell.appendChild(eventBlock);
              }
            }
          });
        });

        timetableGrid.appendChild(slotCell);
      }
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
      console.error(err);
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
