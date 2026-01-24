"""
Lightning-SimulWhisper wrapper service for real-time streaming STT.
Falls back to original openai-whisper on non-Apple Silicon machines.
"""

import asyncio
import logging
import os
import platform
import sys
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Detect Apple Silicon
IS_APPLE_SILICON = platform.system() == "Darwin" and platform.machine() == "arm64"


class SimulWhisperService:
    """Lightning-SimulWhisper wrapper for real-time streaming transcription."""

    def __init__(self):
        self.model_name = os.getenv("WHISPER_MODEL", "base")
        self.language = os.getenv("WHISPER_LANGUAGE", "ko")
        self.use_coreml = os.getenv("USE_COREML", "true").lower() == "true"
        self.online_processor = None
        self.asr = None
        self._initialized = False

    def _init_processor(self):
        """Initialize the SimulWhisper online processor (lazy loading)."""
        if self._initialized:
            return

        # Add simul_whisper to path
        simul_whisper_path = os.path.join(os.path.dirname(__file__), "simul_whisper")
        if simul_whisper_path not in sys.path:
            sys.path.insert(0, simul_whisper_path)

        from argparse import Namespace

        from simulstreaming_whisper import simul_asr_factory

        # Build args namespace matching simulstreaming_whisper.py expectations
        # model_path should be HuggingFace repo for MLX models
        # Note: turbo models don't have -mlx suffix
        if "turbo" in self.model_name:
            model_path = f"mlx-community/whisper-{self.model_name}"
        else:
            model_path = f"mlx-community/whisper-{self.model_name}-mlx"

        args = Namespace(
            log_level="INFO",
            beams=1,  # Greedy decoding for real-time
            decoder=None,  # Auto-select (greedy for beams=1)
            model_path=model_path,
            model_name=self.model_name,
            cif_ckpt_path=None,
            frame_threshold=25,
            audio_min_len=1.0,
            audio_max_len=30.0,
            task="transcribe",
            never_fire=False,
            init_prompt=None,
            static_init_prompt=None,
            max_context_tokens=224,
            logdir=None,
            vad_silence_ms=500,
            use_coreml=self.use_coreml and IS_APPLE_SILICON,
            coreml_encoder_path=None,  # Auto-detect
            coreml_compute_units="ALL",
            lan=self.language,
            min_chunk_size=0.5,
        )

        self.asr, self.online_processor = simul_asr_factory(args)
        self._initialized = True
        logger.info(
            f"SimulWhisper initialized: model={self.model_name}, "
            f"language={self.language}, coreml={self.use_coreml}"
        )

    def reset(self):
        """Reset for new transcription session."""
        if self.online_processor:
            try:
                self.online_processor.finish()
            except Exception:
                pass
            self.online_processor.init()
        else:
            self._init_processor()

    def feed_audio(self, audio_data: bytes) -> Optional[str]:
        """
        Feed audio chunk and get partial transcription result.

        Args:
            audio_data: 16kHz mono int16 PCM bytes

        Returns:
            Partial transcription text or None
        """
        if not self._initialized:
            self._init_processor()

        # Convert int16 PCM to float32 normalized [-1, 1]
        audio_np = (
            np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        )

        # Insert chunk and process
        self.online_processor.insert_audio_chunk(audio_np)
        result = self.online_processor.process_iter()

        if result and result[2]:  # (start_time, end_time, text)
            text = result[2].strip()
            if text:
                return text
        return None

    def finish(self) -> Optional[str]:
        """Finish transcription session and get final result."""
        if not self.online_processor:
            return None

        result = self.online_processor.finish()
        if result and result[2]:
            return result[2].strip()
        return None

    async def feed_audio_async(self, audio_data: bytes) -> Optional[str]:
        """Async version of feed_audio."""
        return await asyncio.to_thread(self.feed_audio, audio_data)

    async def finish_async(self) -> Optional[str]:
        """Async version of finish."""
        return await asyncio.to_thread(self.finish)


class WhisperFallbackService:
    """Fallback service using original openai-whisper with buffering."""

    def __init__(self):
        from whisper_service import WhisperService

        self._service = WhisperService()
        self.buffer = bytearray()
        self.threshold = int(2.5 * 16000 * 2)  # 2.5 seconds of 16kHz int16

    def reset(self):
        """Reset buffer for new session."""
        self.buffer.clear()

    def feed_audio(self, audio_data: bytes) -> Optional[str]:
        """Buffer audio and transcribe when threshold reached."""
        self.buffer.extend(audio_data)
        if len(self.buffer) >= self.threshold:
            audio = bytes(self.buffer)
            self.buffer.clear()
            return self._service.transcribe(audio)
        return None

    def finish(self) -> Optional[str]:
        """Transcribe remaining buffer."""
        if self.buffer:
            audio = bytes(self.buffer)
            self.buffer.clear()
            return self._service.transcribe(audio)
        return None

    async def feed_audio_async(self, audio_data: bytes) -> Optional[str]:
        """Async version of feed_audio."""
        return await asyncio.to_thread(self.feed_audio, audio_data)

    async def finish_async(self) -> Optional[str]:
        """Async version of finish."""
        return await asyncio.to_thread(self.finish)


def create_whisper_service():
    """Factory function to create appropriate whisper service."""
    force_fallback = os.getenv("FORCE_FALLBACK", "false").lower() == "true"

    if IS_APPLE_SILICON and not force_fallback:
        try:
            service = SimulWhisperService()
            service._init_processor()
            logger.info("Using SimulWhisper service (Apple Silicon optimized)")
            return service
        except Exception as e:
            logger.warning(f"SimulWhisper init failed, using fallback: {e}")

    logger.info("Using WhisperFallback service (original openai-whisper)")
    return WhisperFallbackService()


# Global singleton instance
whisper_service = create_whisper_service()
