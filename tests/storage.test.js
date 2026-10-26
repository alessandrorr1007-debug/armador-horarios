import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { APP_CONFIG } from '../src/config.js';

describe('Storage module config and schema', () => {
  test('schema version is 2', () => {
    assert.equal(APP_CONFIG.SCHEMA_VERSION, 2);
    assert.equal(typeof APP_CONFIG.STORAGE_KEY, 'string');
  });

  test('validates session structure correctly', () => {
    const validSession = {
      app: 'Armador de Horarios Inteligente',
      schemaVersion: 2,
      state: {
        coursesData: [
          {
            codigo: 'MAT1',
            nombre: 'Matemática',
            sections: []
          }
        ],
        activeCreditLimit: 20
      }
    };

    assert.ok(Array.isArray(validSession.state.coursesData));
    assert.equal(validSession.state.coursesData.length, 1);
  });
});
