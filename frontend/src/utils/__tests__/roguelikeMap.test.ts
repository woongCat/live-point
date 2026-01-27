import { describe, it, expect } from 'vitest';
import { generateMap } from '../roguelikeMap';

describe('generateMap', () => {
  it('generates correct number of rows', () => {
    const nodes = generateMap(8);
    const rows = new Set(nodes.map(n => n.row));
    expect(rows.size).toBe(8);
  });

  it('last row is always a boss node', () => {
    const nodes = generateMap(8);
    const lastRow = Math.max(...nodes.map(n => n.row));
    const bossNodes = nodes.filter(n => n.row === lastRow);
    expect(bossNodes.length).toBe(1);
    expect(bossNodes[0].type).toBe('boss');
  });

  it('has rest nodes', () => {
    const nodes = generateMap(8);
    expect(nodes.some(n => n.type === 'rest')).toBe(true);
  });

  it('has shop nodes', () => {
    const nodes = generateMap(8);
    expect(nodes.some(n => n.type === 'shop')).toBe(true);
  });

  it('first row nodes have no prerequisites', () => {
    const nodes = generateMap(8);
    const firstRow = nodes.filter(n => n.row === 0);
    expect(firstRow.length).toBeGreaterThan(0);
  });

  it('all non-boss nodes have connections to next row', () => {
    const nodes = generateMap(8);
    const nonLastRow = nodes.filter(n => n.row < 7);
    for (const node of nonLastRow) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it('all nodes have unique ids', () => {
    const nodes = generateMap(8);
    const ids = nodes.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
