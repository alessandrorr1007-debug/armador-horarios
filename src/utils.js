/**
 * @fileoverview Funciones utilitarias para manejo de cadenas, fechas, IDs y debounce.
 */

/**
 * Escapa caracteres HTML especiales para evitar inyecciones en cadenas o atributos.
 * @param {string|null|undefined} str - Cadena a sanitizar.
 * @returns {string} Cadena sanitizada.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (match) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[match] || match;
  });
}

/**
 * Genera un identificador único seguro usando crypto.randomUUID() con fallback.
 * @param {string} [prefix='id'] - Prefijo opcional.
 * @returns {string} Identificador único.
 */
export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${prefix}_${hex}`;
  }

  // Fallback seguro basado en timestamp y contador
  const rand = Math.floor((1 + Math.random()) * 0x1000000).toString(16);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

/**
 * Convierte una cadena de hora (formato 12h o 24h) a minutos totales desde la medianoche.
 * Soporta formatos: "07:00 AM", "02:20 PM", "7:00am", "14:20", "22:15".
 * @param {string|null|undefined} timeStr - Cadena de hora.
 * @returns {number} Minutos transcurridos desde 00:00.
 */
export function timeStringToMin(timeStr) {
  if (!timeStr) return 0;
  const clean = String(timeStr).trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
}

/**
 * Formatea minutos a formato digital 24h "HH:MM".
 * @param {number} totalMinutes - Minutos desde medianoche.
 * @returns {string} "HH:MM"
 */
export function formatTime(totalMinutes) {
  const safeMin = Math.max(0, Math.floor(totalMinutes || 0));
  const hours = Math.floor(safeMin / 60);
  const mins = safeMin % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Formatea minutos a formato 12h "HH:MM AM/PM".
 * @param {number} totalMinutes - Minutos desde medianoche.
 * @returns {string} "HH:MM AM" o "HH:MM PM"
 */
export function formatTime12h(totalMinutes) {
  const safeMin = Math.max(0, Math.floor(totalMinutes || 0));
  let hours = Math.floor(safeMin / 60);
  const mins = safeMin % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
}

/**
 * Crea una versión con debounce de una función.
 * @template T
 * @param {Function} fn - Función a envolver.
 * @param {number} delay - Retardo en ms.
 * @returns {Function} Función con debounce.
 */
export function debounce(fn, delay = 250) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * Copia texto de forma segura al portapapeles.
 * @param {string} text - Texto a copiar.
 * @returns {Promise<boolean>} Verdadero si se copió correctamente.
 */
export async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Intentar fallback si falla la API async
    }
  }

  // Fallback tradicional con textarea oculto
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const success = document.execCommand('copy');
    document.body.removeChild(el);
    return success;
  } catch {
    return false;
  }
}
