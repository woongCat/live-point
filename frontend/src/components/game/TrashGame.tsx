// frontend/src/components/game/TrashGame.tsx
import { useEffect, useCallback, useRef, useState, useLayoutEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GameCanvas } from './GameCanvas';
import { PowerGauge } from './PowerGauge';
import { ScoreBoard } from './ScoreBoard';
import { GameConsentModal } from './GameConsentModal';
import { GameEndModal } from './GameEndModal';
import { useDraggable } from '../../hooks/useDraggable';
import {
  calculateInitialVelocity,
  updateTrashPosition,
  updateBinPosition,
  checkBinCollision,
  isTrashOutOfBounds,
} from '../../utils/gamePhysics';
import {
  THROW_ORIGIN_X,
  THROW_ORIGIN_Y,
  POWER_CHARGE_RATE,
  MAX_POWER,
  SCORE_FOR_SUMMARY,
  STAGE_CONFIGS,
} from '../../utils/gameConstants';

interface TrashGameProps {
  onGameEnd: (score: number, shouldSummarize: boolean) => void;
}

export function TrashGame({ onGameEnd }: TrashGameProps) {
  const {
    gameState,
    trash,
    bin,
    powerLevel,
    isCharging,
    setConsent,
    startGame,
    resetGame,
    setPower,
    setCharging,
    setTrash,
    updateBin,
    addScore,
    incrementThrows,
    incrementHits,
  } = useGameStore();

  const frameRef = useRef<number | undefined>(undefined);
  const chargeRef = useRef<number | undefined>(undefined);

  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const { position, setPosition, isDragging, elementRef, handleMouseDown } = useDraggable({
    initialPosition,
  });

  // Calculate initial position (bottom-right) when game starts
  useLayoutEffect(() => {
    if (gameState.status === 'playing') {
      const gameWidth = 600; // approximate width
      const gameHeight = 400; // approximate height
      const padding = 20;
      const x = window.innerWidth - gameWidth - padding;
      const y = window.innerHeight - gameHeight - padding - 90; // account for footer ad
      const newPosition = { x: Math.max(padding, x), y: Math.max(padding, y) };
      setInitialPosition(newPosition);
      setPosition(newPosition);
    }
  }, [gameState.status, setPosition]);

  useEffect(() => {
    if (!isCharging || gameState.status !== 'playing') {
      if (chargeRef.current) cancelAnimationFrame(chargeRef.current);
      return;
    }

    const charge = () => {
      setPower(powerLevel + POWER_CHARGE_RATE);
      chargeRef.current = requestAnimationFrame(charge);
    };
    chargeRef.current = requestAnimationFrame(charge);

    return () => {
      if (chargeRef.current) cancelAnimationFrame(chargeRef.current);
    };
  }, [isCharging, powerLevel, gameState.status, setPower]);

  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !trash?.isFlying) {
        e.preventDefault();
        setCharging(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isCharging) {
        e.preventDefault();
        setCharging(false);

        const power = (powerLevel / 100) * MAX_POWER;
        const { vx, vy } = calculateInitialVelocity(power);

        setTrash({
          x: THROW_ORIGIN_X,
          y: THROW_ORIGIN_Y,
          velocityX: vx,
          velocityY: vy,
          rotation: 0,
          isFlying: true,
        });
        incrementThrows();
        setPower(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status, isCharging, powerLevel, trash, setCharging, setTrash, incrementThrows, setPower]);

  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const gameLoop = () => {
      updateBin(updateBinPosition(bin));

      if (trash?.isFlying) {
        const newTrash = updateTrashPosition(trash);

        if (checkBinCollision(newTrash, bin)) {
          const config = STAGE_CONFIGS[Math.min(gameState.stage - 1, STAGE_CONFIGS.length - 1)];
          addScore(config.pointsPerHit);
          incrementHits();
          setTrash(null);
        } else if (isTrashOutOfBounds(newTrash)) {
          setTrash(null);
        } else {
          setTrash(newTrash);
        }
      }

      frameRef.current = requestAnimationFrame(gameLoop);
    };

    frameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [gameState.status, gameState.stage, trash, bin, updateBin, setTrash, addScore, incrementHits]);

  const handleAccept = useCallback(() => {
    setConsent(true);
    startGame();
  }, [setConsent, startGame]);

  const handleDecline = useCallback(() => {
    resetGame();
  }, [resetGame]);

  const handleEndClose = useCallback(() => {
    const shouldSummarize = gameState.score >= SCORE_FOR_SUMMARY;
    onGameEnd(gameState.score, shouldSummarize);
    resetGame();
  }, [gameState.score, onGameEnd, resetGame]);

  if (gameState.status === 'idle') return null;

  if (gameState.status === 'consent') {
    return <GameConsentModal onAccept={handleAccept} onDecline={handleDecline} />;
  }

  if (gameState.status === 'ended') {
    return (
      <GameEndModal
        score={gameState.score}
        throws={gameState.throws}
        hits={gameState.hits}
        willSummarize={gameState.score >= SCORE_FOR_SUMMARY}
        onClose={handleEndClose}
      />
    );
  }

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="drag-handle bg-gray-100 px-4 py-2 cursor-grab flex items-center justify-between border-b border-gray-200">
          <span className="font-medium text-gray-700">쓰레기 던지기</span>
          <span className="text-xs text-gray-400">드래그하여 이동</span>
        </div>
        <div className="p-4 flex gap-4">
          <PowerGauge power={powerLevel} isCharging={isCharging} />
          <div className="flex flex-col gap-2">
            <GameCanvas trash={trash} bin={bin} />
            <div className="text-center text-sm text-gray-500">
              스페이스바를 꾹 눌러 파워 충전 - 떼면 발사
            </div>
          </div>
          <ScoreBoard
            score={gameState.score}
            stage={gameState.stage}
            throws={gameState.throws}
            hits={gameState.hits}
          />
        </div>
      </div>
    </div>
  );
}
