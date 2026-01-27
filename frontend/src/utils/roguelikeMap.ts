import type { MapNode, NodeType } from '../types/roguelike';
import { MAP_CONFIG } from '../data/maps';

function pickNodeType(row: number, totalRows: number): NodeType {
  if (row === totalRows - 1) return 'boss';
  if (row === 2 || row === 5) return 'rest';
  if (row === 3) return 'shop';
  return 'combat';
}

function pickEnemyId(): string {
  const pool = MAP_CONFIG.combatEnemyPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateMap(totalRows: number): MapNode[] {
  const nodes: MapNode[] = [];

  for (let row = 0; row < totalRows; row++) {
    const type = pickNodeType(row, totalRows);

    if (type === 'boss') {
      nodes.push({
        id: `node-${row}-0`,
        type: 'boss',
        row,
        col: 1,
        connections: [],
        visited: false,
        enemyId: MAP_CONFIG.bossId,
      });
      continue;
    }

    const count = type === 'rest' || type === 'shop' ? 2 : 3;
    for (let col = 0; col < count; col++) {
      const node: MapNode = {
        id: `node-${row}-${col}`,
        type,
        row,
        col,
        connections: [],
        visited: false,
      };
      if (type === 'combat') {
        node.enemyId = pickEnemyId();
      }
      nodes.push(node);
    }
  }

  for (const node of nodes) {
    if (node.row >= totalRows - 1) continue;
    const nextRow = nodes.filter(n => n.row === node.row + 1);
    if (nextRow.length === 1) {
      node.connections = [nextRow[0].id];
    } else {
      node.connections = nextRow
        .filter(n => Math.abs(n.col - node.col) <= 1)
        .map(n => n.id);
      if (node.connections.length === 0) {
        node.connections = [nextRow[0].id];
      }
    }
  }

  return nodes;
}
