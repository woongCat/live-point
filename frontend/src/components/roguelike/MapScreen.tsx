import { useRoguelikeStore } from '../../stores/roguelikeStore';
import type { MapNode, NodeType } from '../../types/roguelike';

const NODE_ICONS: Record<NodeType, string> = {
  combat: '⚔️',
  rest: '☕',
  shop: '🛒',
  boss: '👹',
};

const NODE_COLORS: Record<NodeType, string> = {
  combat: 'bg-red-900 hover:bg-red-800',
  rest: 'bg-green-900 hover:bg-green-800',
  shop: 'bg-yellow-900 hover:bg-yellow-800',
  boss: 'bg-purple-900 hover:bg-purple-800',
};

export function MapScreen() {
  const { run, selectNode } = useRoguelikeStore();
  if (!run) return null;

  const { mapNodes, currentRow } = run;
  const rows = Array.from(new Set(mapNodes.map(n => n.row))).sort((a, b) => a - b);

  function isSelectable(node: MapNode): boolean {
    if (node.visited) return false;
    if (node.row !== currentRow + 1) return false;
    if (currentRow === -1) return node.row === 0;
    const currentNodes = mapNodes.filter(n => n.row === currentRow && n.visited);
    return currentNodes.some(cn => cn.connections.includes(node.id));
  }

  return (
    <div className="flex flex-col items-center gap-1.5 p-3 overflow-y-auto h-full">
      <h2 className="text-sm font-bold mb-2">회의 맵</h2>
      {rows.map(row => {
        const nodesInRow = mapNodes.filter(n => n.row === row);
        return (
          <div key={row} className="flex gap-4 justify-center">
            {nodesInRow.map(node => {
              const selectable = isSelectable(node);
              return (
                <button
                  key={node.id}
                  disabled={!selectable}
                  onClick={() => selectable && selectNode(node.id)}
                  className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-sm transition-all
                    ${node.visited ? 'bg-gray-700 opacity-50' : selectable ? NODE_COLORS[node.type] + ' ring-2 ring-white' : 'bg-gray-800 opacity-40'}`}
                >
                  <span className="text-lg">{NODE_ICONS[node.type]}</span>
                  <span className="text-[10px] text-gray-300">{row + 1}층</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
