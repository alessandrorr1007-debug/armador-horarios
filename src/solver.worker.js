/**
 * @fileoverview Web Worker para ejecutar el solver en segundo plano sin congelar la UI.
 */

import { solveSchedulesWithLigas } from './solver.js';

self.onmessage = function (e) {
  const { type, payload } = e.data || {};

  if (type === 'SOLVE') {
    try {
      const { courses, creditLimit, unavailabilityBlocks, solverOptions } = payload;
      const result = solveSchedulesWithLigas(
        courses,
        creditLimit,
        unavailabilityBlocks,
        solverOptions
      );
      self.postMessage({ type: 'SUCCESS', result });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message || String(err) });
    }
  }
};
