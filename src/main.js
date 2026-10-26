/**
 * @fileoverview Punto de entrada de la aplicación SPA modular.
 */

import { store } from './store.js';
import { loadSession, hasSavedSession, clearSession } from './storage.js';
import {
  initUiEventListeners,
  updateCourseCountBadges,
  renderStep2Editor,
  goToStep,
  showToast
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Detección de tema preferido del sistema si no hay tema guardado
  const savedSession = loadSession();
  if (!savedSession?.theme) {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    store.setState({ theme: prefersDark ? 'dark' : 'light' });
  }

  // 2. Inicializar eventos y controles de interfaz
  initUiEventListeners();

  // 3. Verificación de sesión previa guardada
  if (hasSavedSession() && savedSession) {
    showRestoreSessionBanner(savedSession);
  } else {
    updateCourseCountBadges();
  }

  // 4. Registro de Service Worker para PWA y soporte offline
  registerServiceWorker();
});

/**
 * Muestra el aviso de restauración de sesión previa.
 * @param {Object} savedState - Estado previo cargado de localStorage.
 */
function showRestoreSessionBanner(savedState) {
  const banner = document.getElementById('restore-session-banner');
  if (!banner) return;

  const count = savedState.coursesData?.length || 0;
  const countSpan = document.getElementById('restore-course-count');
  if (countSpan) countSpan.textContent = `${count} curso${count === 1 ? '' : 's'}`;

  banner.style.display = 'flex';

  document.getElementById('btn-restore-session')?.addEventListener('click', () => {
    store.loadSavedState(savedState);
    banner.style.display = 'none';
    updateCourseCountBadges();
    renderStep2Editor();
    goToStep(savedState.currentStep || 2);
    showToast(`Sesión previa restaurada con ${count} curso(s).`, 'success');
  });

  document.getElementById('btn-discard-session')?.addEventListener('click', () => {
    clearSession();
    store.reset();
    banner.style.display = 'none';
    updateCourseCountBadges();
    goToStep(1);
    showToast('Sesión anterior descartada. Iniciando desde cero.', 'info');
  });
}

/**
 * Registra el Service Worker para permitir el funcionamiento offline y PWA.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                showToast(
                  'Hay una nueva versión disponible. Actualiza la página para ver los cambios.',
                  'info',
                  {
                    label: 'Actualizar',
                    onClick: () => window.location.reload()
                  }
                );
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('Registro de Service Worker omitido:', err);
      });
  }
}
