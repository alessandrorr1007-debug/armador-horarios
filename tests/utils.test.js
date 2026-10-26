import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  generateId,
  timeStringToMin,
  formatTime,
  formatTime12h,
  debounce
} from '../src/utils.js';

describe('Utils module', () => {
  test('escapeHtml escapes dangerous HTML characters', () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.equal(escapeHtml("Tom & 'Jerry'"), 'Tom &amp; &#39;Jerry&#39;');
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
  });

  test('generateId produces non-empty unique string with given prefix', () => {
    const id1 = generateId('course');
    const id2 = generateId('course');
    assert.ok(id1.startsWith('course_'));
    assert.notEqual(id1, id2);
  });

  test('timeStringToMin converts 12h AM/PM strings correctly', () => {
    assert.equal(timeStringToMin('07:00 AM'), 420);
    assert.equal(timeStringToMin('08:50 AM'), 530);
    assert.equal(timeStringToMin('12:00 PM'), 720); // Mediodía
    assert.equal(timeStringToMin('12:00 AM'), 0);   // Medianoche
    assert.equal(timeStringToMin('02:20 PM'), 860); // 14:20
    assert.equal(timeStringToMin('09:35 PM'), 1295);
    assert.equal(timeStringToMin(''), 0);
    assert.equal(timeStringToMin(null), 0);
  });

  test('formatTime formats minutes to HH:MM (24h)', () => {
    assert.equal(formatTime(420), '07:00');
    assert.equal(formatTime(860), '14:20');
    assert.equal(formatTime(0), '00:00');
  });

  test('formatTime12h formats minutes to 12h AM/PM', () => {
    assert.equal(formatTime12h(420), '07:00 AM');
    assert.equal(formatTime12h(720), '12:00 PM');
    assert.equal(formatTime12h(860), '02:20 PM');
    assert.equal(formatTime12h(0), '12:00 AM');
  });

  test('debounce delays function execution', async () => {
    let callCount = 0;
    const fn = debounce(() => {
      callCount++;
    }, 50);

    fn();
    fn();
    fn();

    assert.equal(callCount, 0);
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(callCount, 1);
  });
});
