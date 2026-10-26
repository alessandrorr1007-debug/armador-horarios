/**
 * @fileoverview Store centralizado reactivo con suscripción de eventos y persistencia automática.
 */

import { DEFAULT_UNAVAILABILITY_PRESETS } from './config.js';
import { saveSession } from './storage.js';
import { debounce } from './utils.js';

const debouncedSave = debounce((state) => {
  saveSession(state);
}, 300);

class AppStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      coursesData: [],
      generatedSolutions: [],
      activeSolutionIndex: 0,
      favoriteSolutions: new Set(),
      activeCreditLimit: 0,
      workOptimizationActive: true,
      unavailabilityBlocks: [...DEFAULT_UNAVAILABILITY_PRESETS],
      theme: 'dark',
      currentStep: 1,
      gridPreset: 'upao',
      viewMode: 'grid',
      sortBy: 'deadTime',
      isSolving: false
    };
  }

  /**
   * Obtiene una referencia de solo lectura al estado actual.
   * @returns {Object}
   */
  getState() {
    return this.state;
  }

  /**
   * Actualiza el estado parcialmente y notifica a los suscriptores.
   * @param {Object|Function} updater - Objeto con propiedades a fusionar o función de actualización.
   */
  setState(updater) {
    const patch = typeof updater === 'function' ? updater(this.state) : updater;
    this.state = { ...this.state, ...patch };

    // Notificar a los observadores
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error en listener de store:', err);
      }
    });

    // Guardado automático debounced en localStorage
    debouncedSave(this.state);
  }

  /**
   * Suscribe un listener a cambios de estado.
   * @param {Function} listener - Callback ejecutado en cada cambio.
   * @returns {Function} Función para cancelar la suscripción.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Restaura el estado a partir de una sesión cargada o importada.
   * @param {Object} savedState - Estado a cargar.
   */
  loadSavedState(savedState) {
    this.setState({
      coursesData: savedState.coursesData || [],
      activeCreditLimit: savedState.activeCreditLimit || 0,
      workOptimizationActive: savedState.workOptimizationActive ?? true,
      unavailabilityBlocks:
        savedState.unavailabilityBlocks || [...DEFAULT_UNAVAILABILITY_PRESETS],
      theme: savedState.theme || 'dark',
      currentStep: savedState.currentStep || 1,
      gridPreset: savedState.gridPreset || 'upao',
      viewMode: savedState.viewMode || 'grid',
      sortBy: savedState.sortBy || 'deadTime',
      favoriteSolutions: new Set(savedState.favoriteSolutions || []),
      generatedSolutions: [],
      activeSolutionIndex: 0
    });
  }

  /**
   * Reinicia el estado a los valores iniciales.
   */
  reset() {
    this.setState({
      coursesData: [],
      generatedSolutions: [],
      activeSolutionIndex: 0,
      favoriteSolutions: new Set(),
      activeCreditLimit: 0,
      workOptimizationActive: true,
      unavailabilityBlocks: [...DEFAULT_UNAVAILABILITY_PRESETS],
      currentStep: 1,
      gridPreset: 'upao',
      viewMode: 'grid',
      sortBy: 'deadTime',
      isSolving: false
    });
  }
}

export const store = new AppStore();
