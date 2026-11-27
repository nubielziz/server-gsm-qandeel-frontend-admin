// Tests for the plain-data parts of drag and drop (decision 038): the live-region sentences in English that name the row and its place in the
// whole list, the screen reader instructions, and the rule that a row moves up and down only.
import { describe, expect, it } from 'vitest';
import { DRAG_INSTRUCTIONS, dragAnnouncements, restrictToVerticalAxis, type RowInfo } from './dragSupport';

const rows = new Map<string | number, RowInfo>([
  [1, { label: 'Apple', place: 1 }],
  [2, { label: 'Samsung', place: 2 }],
  [3, { label: 'Generic', place: 3 }],
]);
const say = dragAnnouncements((id) => rows.get(id), 5);
const at = (id: number) => ({ id }) as never;

describe('dragAnnouncements', () => {
  it('says what was picked up and where it stands', () => {
    expect(say.onDragStart({ active: at(2) })).toBe('Picked up Samsung, position 2 of 5.');
  });

  it('says which row the dragged one is over', () => {
    expect(say.onDragOver({ active: at(1), over: at(3) })).toBe('Apple is over Generic, position 3 of 5.');
  });

  it('says nothing when the row is over itself or over nothing', () => {
    expect(say.onDragOver({ active: at(1), over: at(1) })).toBeUndefined();
    expect(say.onDragOver({ active: at(1), over: null })).toBeUndefined();
  });

  it('says where a row was dropped, and that it stayed when it was dropped on itself or on nothing', () => {
    expect(say.onDragEnd({ active: at(1), over: at(3) })).toBe('Apple dropped at position 3 of 5.');
    expect(say.onDragEnd({ active: at(2), over: at(2) })).toBe(
      'Samsung dropped where it was, position 2 of 5.',
    );
    expect(say.onDragEnd({ active: at(2), over: null })).toBe(
      'Samsung dropped where it was, position 2 of 5.',
    );
  });

  it('says a cancelled drag put the row back', () => {
    expect(say.onDragCancel({ active: at(3), over: null })).toBe(
      'Dragging cancelled. Generic is back at position 3 of 5.',
    );
  });

  it('says nothing for a row it does not know', () => {
    expect(say.onDragStart({ active: at(99) })).toBeUndefined();
    expect(say.onDragEnd({ active: at(99), over: null })).toBeUndefined();
  });
});

describe('DRAG_INSTRUCTIONS', () => {
  it('tells how to pick up, move, drop and cancel, in English', () => {
    expect(DRAG_INSTRUCTIONS.draggable).toMatch(/press space or enter on its grip/);
    expect(DRAG_INSTRUCTIONS.draggable).toMatch(/up and down arrow keys/);
    expect(DRAG_INSTRUCTIONS.draggable).toMatch(/escape to cancel/);
  });
});

describe('restrictToVerticalAxis', () => {
  it('keeps the vertical movement and drops the sideways one', () => {
    const move = restrictToVerticalAxis({ transform: { x: 40, y: -25, scaleX: 1, scaleY: 1 } } as never);
    expect(move).toEqual({ x: 0, y: -25, scaleX: 1, scaleY: 1 });
  });
});
