import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseScheduleText, parseScheduleTextWithDiagnostics } from '../src/parser.js';

describe('Parser module', () => {
  const sampleUpaoSingle = `
MAT-101 - (CALC1) CALCULO I
NRC: 1234
SECC: 01
CRED: 4
CAPA: 35
REGI: 20
LUN 07:00 AM - 08:50 AM PAB-A 101 12345 JUAN PEREZ LOPEZ
MIE 07:00 AM - 08:50 AM PAB-A 101 12345 JUAN PEREZ LOPEZ
`;

  const sampleUpaoWithLigas = `
FIS-201 - (FIS1) FISICA GENERAL
Sec 01 (NRC: 5580)
ID LIGA: T1
LIGA: G1
Grupo: T1 ➔ G1
CRED: 4
CAPA: 30
REGI: 15
MAR 08:50 AM - 10:40 AM Lab1 23456 CARLOS MENDOZA

Sec 02 (NRC: 5581)
ID LIGA: P1
LIGA: G1
Grupo: P1 ➔ G1
CRED: 4
CAPA: 15
REGI: 10
JUE 08:50 AM - 10:40 AM Lab1 23456 CARLOS MENDOZA
`;

  const sampleUpaoClosedSection = `
QUI-101 - (QUIM1) QUIMICA GENERAL
NRC: 9999
SECC: 01
CRED: 3
CAPA: 30
REGI: 30 CERRADO
🔴 CERRADO
VIE 07:00 AM - 08:50 AM PAB-B 202
`;

  test('parses a standard single course with multiple slots and teacher', () => {
    const courses = parseScheduleText(sampleUpaoSingle);
    assert.equal(courses.length, 1);
    const c = courses[0];
    assert.equal(c.codigo, 'CALC1');
    assert.equal(c.creditosCurso, 4);
    assert.equal(c.sections.length, 1);

    const s = c.sections[0];
    assert.equal(s.nrc, '1234');
    assert.equal(s.secc, '01');
    assert.equal(s.slots.length, 2);
    assert.equal(s.slots[0].dia, 'LUN');
    assert.equal(s.slots[1].dia, 'MIE');
    assert.equal(s.docente, 'JUAN PEREZ LOPEZ');
    assert.equal(s.capa, 35);
    assert.equal(s.regi, 20);
    assert.equal(s.estado, 'ABIERTO');
    assert.equal(s.incluirEnArmado, true);
  });

  test('parses course with theory and practice ligas correctly', () => {
    const courses = parseScheduleText(sampleUpaoWithLigas);
    assert.equal(courses.length, 1);
    const c = courses[0];
    assert.equal(c.codigo, 'FIS1');
    assert.equal(c.sections.length, 2);

    const s1 = c.sections[0];
    assert.equal(s1.tipoLiga, 'T');
    assert.equal(s1.grupoLiga, '1');

    const s2 = c.sections[1];
    assert.equal(s2.tipoLiga, 'P');
    assert.equal(s2.grupoLiga, '1');
  });

  test('detects closed sections and marks them as CERRADO and excluded by default', () => {
    const courses = parseScheduleText(sampleUpaoClosedSection);
    assert.equal(courses.length, 1);
    const s = courses[0].sections[0];
    assert.equal(s.estado, 'CERRADO');
    assert.equal(s.incluirEnArmado, false);
  });

  test('handles missing teacher or classroom gracefully with defaults', () => {
    const raw = `
BIO-101 - BIOLOGIA
NRC: 4321
SECC: 02
SAB 02:20 PM - 04:10 PM
`;
    const courses = parseScheduleText(raw);
    assert.equal(courses.length, 1);
    const s = courses[0].sections[0];
    assert.equal(s.docente, 'Docente asignado');
    assert.equal(s.aula, 'Aula N/A');
  });

  test('reports errors and diagnostics on garbage input', () => {
    const { courses, errors } = parseScheduleTextWithDiagnostics('hola esto no es un horario');
    assert.equal(courses.length, 0);
    assert.ok(errors.length > 0);
  });

  test('rejects empty or whitespace-only inputs', () => {
    const { courses, errors } = parseScheduleTextWithDiagnostics('   \n  \t ');
    assert.equal(courses.length, 0);
    assert.ok(errors[0].includes('vacío'));
  });
});
