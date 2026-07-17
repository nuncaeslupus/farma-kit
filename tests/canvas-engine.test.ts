import { describe, test, expect } from 'vitest';
import { lockAxis } from '../src/editor/canvas-engine';

describe('lockAxis', () => {
  test('no Shift never constrains', () => {
    expect(lockAxis(40, 3, false)).toBe(null);
    expect(lockAxis(0, 0, false)).toBe(null);
  });

  // The two gestures the editor has to get right: Shift pressed *after* the drag
  // has committed to a direction keeps that direction, and Shift held from the
  // start picks whichever way the pointer has actually gone so far.
  test('Shift after a mostly-vertical drag freezes x, leaving vertical movement', () => {
    expect(lockAxis(4, -60, true)).toBe('x');
  });
  test('Shift after a mostly-horizontal drag freezes y', () => {
    expect(lockAxis(-60, 4, true)).toBe('y');
  });

  test('the axis re-decides as the drag turns', () => {
    expect(lockAxis(30, 10, true)).toBe('y'); // moving across
    expect(lockAxis(30, 50, true)).toBe('x'); // ...now mostly down
  });

  test('a Shift-drag that has not moved yet freezes x rather than jumping', () => {
    expect(lockAxis(0, 0, true)).toBe('x');
  });
});
