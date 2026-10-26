import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { solveSchedulesWithLigas } from '../src/solver.js';

describe('Solver module', () => {
  const courseA = {
    codigo: 'CURSO_A',
    nombre: 'Curso A',
    creditosCurso: 4,
    obligatorio: false,
    sections: [
      {
        nrc: '1001',
        secc: '01',
        dia: 'LUN',
        horaInicio: '07:00 AM',
        horaFin: '08:50 AM',
        slots: [{ dia: 'LUN', horaInicio: '07:00 AM', horaFin: '08:50 AM' }],
        estado: 'ABIERTO',
        incluirEnArmado: true
      }
    ]
  };

  const courseB_Compatible = {
    codigo: 'CURSO_B',
    nombre: 'Curso B Compatible',
    creditosCurso: 3,
    obligatorio: false,
    sections: [
      {
        nrc: '2001',
        secc: '01',
        dia: 'MAR',
        horaInicio: '07:00 AM',
        horaFin: '08:50 AM',
        slots: [{ dia: 'MAR', horaInicio: '07:00 AM', horaFin: '08:50 AM' }],
        estado: 'ABIERTO',
        incluirEnArmado: true
      }
    ]
  };

  const courseC_ConflictWithA = {
    codigo: 'CURSO_C',
    nombre: 'Curso C en Conflicto con A',
    creditosCurso: 3,
    obligatorio: false,
    sections: [
      {
        nrc: '3001',
        secc: '01',
        dia: 'LUN',
        horaInicio: '07:00 AM',
        horaFin: '08:50 AM', // Mismo horario que Curso A
        slots: [{ dia: 'LUN', horaInicio: '07:00 AM', horaFin: '08:50 AM' }],
        estado: 'ABIERTO',
        incluirEnArmado: true
      }
    ]
  };

  test('finds valid combination for non-conflicting courses', () => {
    const solutions = solveSchedulesWithLigas([courseA, courseB_Compatible]);
    assert.ok(Array.isArray(solutions));
    assert.ok(solutions.length > 0);
    const sol = solutions[0];
    assert.equal(sol.selection.length, 2);
    assert.equal(sol.totalCredits, 7);
  });

  test('reports mandatory_conflict error when two mandatory courses collide', () => {
    const mandatoryA = { ...courseA, obligatorio: true };
    const mandatoryC = { ...courseC_ConflictWithA, obligatorio: true };

    const result = solveSchedulesWithLigas([mandatoryA, mandatoryC]);
    assert.ok(result && result.error === 'mandatory_conflict');
    assert.ok(result.courses.includes('CURSO_A'));
    assert.ok(result.courses.includes('CURSO_C'));
  });

  test('reports mandatory_no_sections when a mandatory course has no open sections', () => {
    const mandatoryNoSec = {
      codigo: 'CURSO_M',
      nombre: 'Mandatorio Sin Secciones',
      creditosCurso: 4,
      obligatorio: true,
      sections: [
        {
          nrc: '4001',
          estado: 'CERRADO',
          incluirEnArmado: false,
          slots: [{ dia: 'LUN', horaInicio: '07:00 AM', horaFin: '08:50 AM' }]
        }
      ]
    };

    const result = solveSchedulesWithLigas([mandatoryNoSec]);
    assert.ok(result && result.error === 'mandatory_no_sections');
    assert.ok(result.courses.includes('CURSO_M'));
  });

  test('strictly enforces credit limit constraint', () => {
    // Curso A: 4 créditos, Curso B: 3 créditos.
    // Límite de créditos = 5.
    // Solo puede entrar uno de los dos por solución.
    const solutions = solveSchedulesWithLigas([courseA, courseB_Compatible], 5);
    assert.ok(Array.isArray(solutions));
    assert.ok(solutions.length > 0);
    solutions.forEach((sol) => {
      assert.ok(sol.totalCredits <= 5);
    });
  });

  test('handles courses with complete ligas (theory and practice bound)', () => {
    const courseWithLigas = {
      codigo: 'QUIM',
      nombre: 'Química con Ligas',
      creditosCurso: 4,
      obligatorio: false,
      sections: [
        // Grupo 1 Teoría
        {
          nrc: '5001',
          secc: '01',
          idLiga: 'T1',
          grupoLiga: '1',
          tipoLiga: 'T',
          slots: [{ dia: 'LUN', horaInicio: '07:00 AM', horaFin: '08:50 AM' }],
          estado: 'ABIERTO',
          incluirEnArmado: true
        },
        // Grupo 1 Práctica
        {
          nrc: '5002',
          secc: '01-P',
          idLiga: 'P1',
          grupoLiga: '1',
          tipoLiga: 'P',
          slots: [{ dia: 'MIE', horaInicio: '07:00 AM', horaFin: '08:50 AM' }],
          estado: 'ABIERTO',
          incluirEnArmado: true
        }
      ]
    };

    const solutions = solveSchedulesWithLigas([courseWithLigas]);
    assert.ok(Array.isArray(solutions));
    assert.ok(solutions.length > 0);
    // Debe haber seleccionado 2 secciones (Teoría + Práctica del Grupo 1)
    assert.equal(solutions[0].selection.length, 2);
  });
});
