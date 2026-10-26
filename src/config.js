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

export const COURSE_COLORS = [
  { bg: '#4f46e5', text: '#ffffff' }, // Indigo
  { bg: '#059669', text: '#ffffff' }, // Emerald
  { bg: '#d97706', text: '#ffffff' }, // Amber
  { bg: '#7c3aed', text: '#ffffff' }, // Purple
  { bg: '#0891b2', text: '#ffffff' }, // Cyan
  { bg: '#dc2626', text: '#ffffff' }, // Red
  { bg: '#ea580c', text: '#ffffff' }, // Orange
  { bg: '#be185d', text: '#ffffff' } // Pink
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
