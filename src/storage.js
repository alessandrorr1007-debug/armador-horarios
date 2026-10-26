/**
 * @fileoverview Manejo seguro de persistencia en localStorage y exportación/importación JSON.
 */

import { APP_CONFIG, DEFAULT_UNAVAILABILITY_PRESETS } from './config.js';

/**
 * @typedef {Object} SessionState
 * @property {Array} coursesData - Lista de cursos cargados.
 * @property {number} activeCreditLimit - Límite de créditos configurado.
 * @property {boolean} workOptimizationActive - Estado del modo trabajo.
 * @property {Array} unavailabilityBlocks - Bloques de indisponibilidad personalizados.
 * @property {'dark'|'light'} theme - Tema visual.
 * @property {number} currentStep - Paso actual (1, 2 o 3).
 * @property {'upao'|'hourly'} gridPreset - Preset de cuadrícula.
 * @property {'grid'|'agenda'} viewMode - Modo de vista (calendario o agenda).
 * @property {'deadTime'|'days'|'efficiency'|'credits'} sortBy - Criterio de ordenamiento.
 * @property {Array<number>} [favoriteSolutions] - Índices de opciones favoritas.
 */

/**
 * Guarda el estado actual de la sesión en localStorage de forma segura.
 * @param {SessionState} state - Datos a persistir.
 * @returns {boolean} True si se guardó exitosamente.
 */
export function saveSession(state) {
  try {
    if (typeof localStorage === 'undefined') return false;

    const payload = {
      schemaVersion: APP_CONFIG.SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      state: {
        coursesData: state.coursesData || [],
        activeCreditLimit: state.activeCreditLimit || 0,
        workOptimizationActive: state.workOptimizationActive ?? true,
        unavailabilityBlocks:
          state.unavailabilityBlocks || DEFAULT_UNAVAILABILITY_PRESETS,
        theme: state.theme || 'dark',
        currentStep: state.currentStep || 1,
        gridPreset: state.gridPreset || 'upao',
        viewMode: state.viewMode || 'grid',
        sortBy: state.sortBy || 'deadTime',
        favoriteSolutions: Array.from(state.favoriteSolutions || [])
      }
    };

    localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('No se pudo guardar la sesión en localStorage:', err);
    return false;
  }
}

/**
 * Carga la sesión guardada desde localStorage con soporte de migración.
 * @returns {SessionState|null}
 */
export function loadSession() {
  try {
    if (typeof localStorage === 'undefined') return null;

    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Migraciones de versiones si correspondiera
    const savedState = parsed.state || parsed;

    if (!Array.isArray(savedState.coursesData)) {
      savedState.coursesData = [];
    }

    if (!Array.isArray(savedState.unavailabilityBlocks)) {
      savedState.unavailabilityBlocks = DEFAULT_UNAVAILABILITY_PRESETS;
    }

    return {
      coursesData: savedState.coursesData,
      activeCreditLimit: Number(savedState.activeCreditLimit) || 0,
      workOptimizationActive: savedState.workOptimizationActive ?? true,
      unavailabilityBlocks: savedState.unavailabilityBlocks,
      theme: savedState.theme === 'light' ? 'light' : 'dark',
      currentStep: Number(savedState.currentStep) || 1,
      gridPreset: savedState.gridPreset === 'hourly' ? 'hourly' : 'upao',
      viewMode: savedState.viewMode === 'agenda' ? 'agenda' : 'grid',
      sortBy: savedState.sortBy || 'deadTime',
      favoriteSolutions: new Set(savedState.favoriteSolutions || [])
    };
  } catch (err) {
    console.warn('Error al leer la sesión guardada de localStorage:', err);
    return null;
  }
}

/**
 * Verifica si existe una sesión previa guardada que contenga cursos.
 * @returns {boolean}
 */
export function hasSavedSession() {
  const session = loadSession();
  return Boolean(session && session.coursesData && session.coursesData.length > 0);
}

/**
 * Elimina la sesión guardada en localStorage.
 */
export function clearSession() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Error al limpiar localStorage:', err);
  }
}

/**
 * Exporta el estado actual como un archivo JSON descargable.
 * @param {SessionState} state - Estado a exportar.
 */
export function exportSessionJson(state) {
  const payload = {
    app: 'Armador de Horarios Inteligente',
    schemaVersion: APP_CONFIG.SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    state: {
      coursesData: state.coursesData || [],
      activeCreditLimit: state.activeCreditLimit || 0,
      workOptimizationActive: state.workOptimizationActive ?? true,
      unavailabilityBlocks: state.unavailabilityBlocks || DEFAULT_UNAVAILABILITY_PRESETS,
      theme: state.theme || 'dark',
      gridPreset: state.gridPreset || 'upao',
      sortBy: state.sortBy || 'deadTime'
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Horarios_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Importa y valida una sesión desde un archivo JSON.
 * @param {File} file - Archivo JSON seleccionado por el usuario.
 * @returns {Promise<SessionState>}
 */
export function importSessionJson(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se seleccionó ningún archivo.'));
    }

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      return reject(new Error('El archivo seleccionado debe tener extensión .json.'));
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const data = JSON.parse(text);

        const importedState = data.state || data;

        if (!importedState || !Array.isArray(importedState.coursesData)) {
          return reject(
            new Error(
              'El archivo JSON no contiene un formato de cursos válido compatible con Armador de Horarios.'
            )
          );
        }

        // Validación básica de cada curso
        const validCourses = importedState.coursesData.filter(
          (c) => c && typeof c.codigo === 'string' && Array.isArray(c.sections)
        );

        if (validCourses.length === 0 && importedState.coursesData.length > 0) {
          return reject(
            new Error('Los cursos del archivo JSON no cumplen con la estructura requerida.')
          );
        }

        resolve({
          coursesData: validCourses,
          activeCreditLimit: Number(importedState.activeCreditLimit) || 0,
          workOptimizationActive: importedState.workOptimizationActive ?? true,
          unavailabilityBlocks: Array.isArray(importedState.unavailabilityBlocks)
            ? importedState.unavailabilityBlocks
            : DEFAULT_UNAVAILABILITY_PRESETS,
          theme: importedState.theme === 'light' ? 'light' : 'dark',
          currentStep: 2, // Tras importar llevamos al paso 2
          gridPreset: importedState.gridPreset === 'hourly' ? 'hourly' : 'upao',
          viewMode: 'grid',
          sortBy: importedState.sortBy || 'deadTime',
          favoriteSolutions: new Set()
        });
      } catch (err) {
        reject(new Error('No se pudo interpretar el archivo JSON: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo desde el disco.'));
    reader.readAsText(file);
  });
}
