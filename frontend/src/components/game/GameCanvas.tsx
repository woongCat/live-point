// frontend/src/components/game/GameCanvas.tsx
import { useRef, useEffect } from 'react';
import type { Trash, TrashBin } from '../../types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRASH_SIZE, THROW_ORIGIN_X, THROW_ORIGIN_Y } from '../../utils/gameConstants';

interface GameCanvasProps {
  trash: Trash | null;
  bin: TrashBin;
}

export function GameCanvas({ trash, bin }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Throw origin
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(THROW_ORIGIN_X, THROW_ORIGIN_Y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('발사', THROW_ORIGIN_X, THROW_ORIGIN_Y + 4);

    // Trash bin
    ctx.fillStyle = '#374151';
    const binY = CANVAS_HEIGHT - bin.height - 20;
    ctx.fillRect(bin.x, binY, bin.width, bin.height);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(bin.x + 5, binY, bin.width - 10, 10);

    // Trash
    if (trash && trash.isFlying) {
      ctx.save();
      ctx.translate(trash.x + TRASH_SIZE / 2, trash.y + TRASH_SIZE / 2);
      ctx.rotate((trash.rotation * Math.PI) / 180);

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, TRASH_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -5);
      ctx.lineTo(-5, 5);
      ctx.stroke();

      ctx.restore();
    }

    // Ground
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
  }, [trash, bin]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border border-gray-300 rounded-lg"
    />
  );
}
