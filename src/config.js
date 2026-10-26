/**
 * @fileoverview Configuración, constantes y presets de Armador de Horarios.
 */

export const DAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

export const DAY_ALIASES = {
  lun: 0,
  lunes: 0,
  l: 0,
  mar: 1,
  martes: 1,
  m: 1,
  mie: 2,
  miercoles: 2,
  miércoles: 2,
  x: 2,
  jue: 3,
  jueves: 3,
  j: 3,
  vie: 4,
  viernes: 4,
  v: 4,
  sab: 5,
  sabado: 5,
  sábado: 5,
  s: 5,
  dom: 6,
  domingo: 6,
  d: 6
};

// Paleta sofisticada, madura y armónica (estilo Linear / Notion Calendar / Apple)
export const COURSE_COLORS = [
  { bg: '#232c45', border: '#42537f', text: '#f1f5f9' }, // Slate Indigo
  { bg: '#1c342b', border: '#335e4e', text: '#ecfdf5' }, // Forest Sage
  { bg: '#362b1b', border: '#665133', text: '#fefce8' }, // Warm Ochre
  { bg: '#2f213a', border: '#593f6e', text: '#faf5ff' }, // Muted Plum
  { bg: '#182b3d', border: '#2d4f70', text: '#f0f9ff' }, // Steel Blue
  { bg: '#382020', border: '#6b3d3d', text: '#fff1f2' }, // Terracotta
  { bg: '#153234', border: '#265759', text: '#f0fdfa' }, // Deep Teal
  { bg: '#2b2927', border: '#4f4c47', text: '#fcfcfc' }  // Warm Graphite
];

export const GRID_PRESETS = {
  upao: {
    id: 'upao',
    name: 'Bloques Oficiales UPAO',
    description: 'Turnos institucionales oficiales de 110 y 105 minutos',
    baseMin: 420, // 07:00 AM
    maxMin: 1295, // 09:35 PM
    pxPerMin: 1.2,
    rows: [
      { startMin: 420, endMin: 530, label: '07:00 AM', durationMin: 110 },
      { startMin: 530, endMin: 640, label: '08:50 AM', durationMin: 110 },
      { startMin: 640, endMin: 745, label: '10:40 AM', durationMin: 105 },
      { startMin: 745, endMin: 860, label: '12:25 PM', durationMin: 115 },
      { startMin: 860, endMin: 970, label: '02:20 PM', durationMin: 110 },
      { startMin: 970, endMin: 1080, label: '04:10 PM', durationMin: 110 },
      { startMin: 1080, endMin: 1190, label: '06:00 PM', durationMin: 110 },
      { startMin: 1190, endMin: 1295, label: '07:50 PM', durationMin: 105 }
    ]
  },
  hourly: {
    id: 'hourly',
    name: 'Bloques de 1 Hora (Estándar)',
    description: 'Intervalos regulares de 60 minutos (07:00 a 22:00)',
    baseMin: 420, // 07:00 AM
    maxMin: 1320, // 10:00 PM
    pxPerMin: 1.0,
    rows: [
      { startMin: 420, endMin: 480, label: '07:00 AM', durationMin: 60 },
      { startMin: 480, endMin: 540, label: '08:00 AM', durationMin: 60 },
      { startMin: 540, endMin: 600, label: '09:00 AM', durationMin: 60 },
      { startMin: 600, endMin: 660, label: '10:00 AM', durationMin: 60 },
      { startMin: 660, endMin: 720, label: '11:00 AM', durationMin: 60 },
      { startMin: 720, endMin: 780, label: '12:00 PM', durationMin: 60 },
      { startMin: 780, endMin: 840, label: '01:00 PM', durationMin: 60 },
      { startMin: 840, endMin: 900, label: '02:00 PM', durationMin: 60 },
      { startMin: 900, endMin: 960, label: '03:00 PM', durationMin: 60 },
      { startMin: 960, endMin: 1020, label: '04:00 PM', durationMin: 60 },
      { startMin: 1020, endMin: 1080, label: '05:00 PM', durationMin: 60 },
      { startMin: 1080, endMin: 1140, label: '06:00 PM', durationMin: 60 },
      { startMin: 1140, endMin: 1200, label: '07:00 PM', durationMin: 60 },
      { startMin: 1200, endMin: 1260, label: '08:00 PM', durationMin: 60 },
      { startMin: 1260, endMin: 1320, label: '09:00 PM', durationMin: 60 }
    ]
  }
};

export const DEFAULT_UNAVAILABILITY_PRESETS = [
  {
    id: 'preset_saturday_work',
    name: 'Trabajo sábado hasta 15:30',
    days: [5], // Sábado
    startMin: 420, // 07:00 AM
    endMin: 930, // 03:30 PM (930 minutos)
    active: true
  },
  {
    id: 'preset_weekday_mornings',
    name: 'Mañanas libres (Lun-Vie 07:00 - 12:00)',
    days: [0, 1, 2, 3, 4],
    startMin: 420,
    endMin: 720,
    active: false
  },
  {
    id: 'preset_weekday_afternoons',
    name: 'Tardes libres (Lun-Vie 14:00 - 18:00)',
    days: [0, 1, 2, 3, 4],
    startMin: 840,
    endMin: 1080,
    active: false
  },
  {
    id: 'preset_weekday_nights',
    name: 'Noches libres (Lun-Vie 19:00 - 22:00)',
    days: [0, 1, 2, 3, 4],
    startMin: 1140,
    endMin: 1320,
    active: false
  }
];

export const APP_CONFIG = {
  MAX_INPUT_TEXT_LENGTH: 500000, // 500 KB
  SOLVER_TIMEOUT_MS: 8000,
  MAX_SOLUTIONS_LIMIT: 50,
  STORAGE_KEY: 'armador_horarios_session_v2',
  SCHEMA_VERSION: 2,
  DEFAULT_SEMESTER_WEEKS: 16
};

// Datos representativos reales de prueba de la UPAO para demostración en 1 clic
export const SAMPLE_UPAO_TEXT = `MAT-101 - (CALC1) CALCULO I
NRC: 1201
SECC: 01
CRED: 4
CAPA: 35
REGI: 18
LUN 07:00 AM - 08:50 AM PAB-A 302 10823 PEREZ CHAVEZ JORGE
MIE 07:00 AM - 08:50 AM PAB-A 302 10823 PEREZ CHAVEZ JORGE

NRC: 1202
SECC: 02
CRED: 4
CAPA: 35
REGI: 22
MAR 08:50 AM - 10:40 AM PAB-B 201 10452 RAMOS ZAVALA LUIS
JUE 08:50 AM - 10:40 AM PAB-B 201 10452 RAMOS ZAVALA LUIS

FIS-201 - (FIS1) FISICA GENERAL
Sec 01 (NRC: 2301)
ID LIGA: T1
LIGA: G1
Grupo: T1 ➔ G1
CRED: 4
CAPA: 30
REGI: 16
MAR 10:40 AM - 12:25 PM PAB-C 105 20194 MENDOZA RUIZ CARLOS

Sec 02 (NRC: 2302)
ID LIGA: P1
LIGA: G1
Grupo: P1 ➔ G1
CRED: 4
CAPA: 15
REGI: 10
JUE 10:40 AM - 12:25 PM Lab-Fis 101 20194 MENDOZA RUIZ CARLOS

Sec 03 (NRC: 2303)
ID LIGA: T2
LIGA: G2
Grupo: T2 ➔ G2
CRED: 4
CAPA: 30
REGI: 20
LUN 02:20 PM - 04:10 PM PAB-C 105 18451 ALVAREZ RIOS HUGO

Sec 04 (NRC: 2304)
ID LIGA: P2
LIGA: G2
Grupo: P2 ➔ G2
CRED: 4
CAPA: 15
REGI: 12
VIE 02:20 PM - 04:10 PM Lab-Fis 102 18451 ALVAREZ RIOS HUGO

SIS-301 - (ALGO1) ALGORITMOS Y ESTRUCTURAS DE DATOS
NRC: 3401
SECC: 01
CRED: 4
CAPA: 32
REGI: 15
MIE 10:40 AM - 12:25 PM Lab-Comp 204 15201 VIZCARRA VEGA ROSA
VIE 10:40 AM - 12:25 PM Lab-Comp 204 15201 VIZCARRA VEGA ROSA

NRC: 3402
SECC: 02
CRED: 4
CAPA: 30
REGI: 30 CERRADO
🔴 CERRADO
MAR 02:20 PM - 04:10 PM Lab-Comp 201 15201 VIZCARRA VEGA ROSA
`;
