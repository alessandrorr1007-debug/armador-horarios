import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSolutionMetrics } from '../src/metrics.js';

describe('Metrics module', () => {
  test('calculates dead time correctly for classes on the same day', () => {
    // Clase 1: Lunes 07:00 a 08:50 (420 a 530)
    // Clase 2: Lunes 10:40 a 12:25 (640 a 745)
    // Hueco: 640 - 530 = 110 minutos = 1.83 horas
    const selection = [
      {
        courseId: 'MAT-1',
        slots: [{ day: 0, startMin: 420, endMin: 530 }]
      },
      {
        courseId: 'FIS-1',
        slots: [{ day: 0, startMin: 640, endMin: 745 }]
      }
    ];

    const metrics = calculateSolutionMetrics(selection);
    assert.equal(metrics.totalDeadTimeMin, 110);
    assert.equal(metrics.activeDaysCount, 1);
    assert.ok(metrics.totalWeeklyHours > 0);
  });

  test('ignores 5 minute passing period gap', () => {
    // Clase 1: Lunes 07:00 a 08:50 (420 a 530)
    // Clase 2: Lunes 08:55 a 10:40 (535 a 640)
    // Gap es 5 minutos, debe contarse como 0 hueco
    const selection = [
      {
        courseId: 'MAT-1',
        slots: [{ day: 0, startMin: 420, endMin: 530 }]
      },
      {
        courseId: 'FIS-1',
        slots: [{ day: 0, startMin: 535, endMin: 640 }]
      }
    ];

    const metrics = calculateSolutionMetrics(selection);
    assert.equal(metrics.totalDeadTimeMin, 0);
    assert.equal(metrics.efficiencyPct, 100);
  });

  test('detects collision with custom unavailability blocks', () => {
    const selection = [
      {
        courseId: 'LAB-1',
        slots: [{ day: 5, startMin: 480, endMin: 600 }] // Sábado 08:00 a 10:00
      }
    ];

    const blocks = [
      {
        id: 'work_sat',
        name: 'Trabajo Sábado',
        days: [5],
        startMin: 420,
        endMin: 930,
        active: true
      }
    ];

    const metrics = calculateSolutionMetrics(selection, blocks);
    assert.equal(metrics.hasUnavailabilityConflict, true);
    assert.ok(metrics.conflictReasons.includes('Trabajo Sábado'));
    assert.ok(metrics.score < 500000);
  });
});
