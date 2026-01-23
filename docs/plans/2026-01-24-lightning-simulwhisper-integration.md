# Lightning-SimulWhisper Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace openai-whisper with Lightning-SimulWhisper for real-time streaming STT with ~15x performance improvement on Apple Silicon.

**Architecture:** Clone Lightning-SimulWhisper as a submodule, create a wrapper service (`simul_whisper_service.py`) with the same interface as current `whisper_service.py`, modify WebSocket handler to process audio chunks immediately instead of buffering 2.5 seconds. Include fallback to original whisper for non-Apple Silicon machines.

**Tech Stack:** Python 3.11+, FastAPI, Lightning-SimulWhisper (MLX + CoreML), faster-whisper (fallback)

---

## Task 1: Clone Lightning-SimulWhisper Repository

**Files:**
- Create: `backend/simul_whisper/` (git clone)

**Step 1: Clone the repository**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
git clone https://github.com/altalt-org/Lightning-SimulWhisper.git simul_whisper
```

Expected: Directory `backend/simul_whisper/` created with project files

**Step 2: Verify clone success**

Run:
```bash
ls /Users/song-giung/code/side-project/live-point/backend/simul_whisper/simulstreaming_whisper.py
```

Expected: File exists

**Step 3: Add to .gitignore (optional - if not using submodule)**

Run:
```bash
echo "backend/simul_whisper/" >> /Users/song-giung/code/side-project/live-point/.gitignore
```

**Step 4: Commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add .gitignore
git commit -m "chore: add simul_whisper to gitignore"
```

---

## Task 2: Update requirements.txt with MLX Dependencies

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: Update requirements.txt**

Replace contents of `backend/requirements.txt` with:

```txt
# FastAPI & Server
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
websockets>=12.0

# OpenAI (for LLM)
openai>=1.12.0

# Audio processing
numpy>=1.26.0

# Whisper - original (fallback)
openai-whisper>=20231117

# Lightning-SimulWhisper dependencies (Apple Silicon)
mlx>=0.5.0
librosa>=0.10.0
tiktoken>=0.5.0
```

**Step 2: Install dependencies**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
pip install -r requirements.txt
```

Expected: All packages install successfully

**Step 3: Verify MLX installation**

Run:
```bash
python -c "import mlx; print('MLX version:', mlx.__version__)"
```

Expected: Prints MLX version (e.g., `MLX version: 0.5.0` or higher)

**Step 4: Commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add backend/requirements.txt
git commit -m "deps: add MLX and Lightning-SimulWhisper dependencies"
```

---

## Task 3: Update .env.example with New Environment Variables

**Files:**
- Modify: `backend/.env.example`

**Step 1: Update .env.example**

Replace contents of `backend/.env.example` with:

```env
# OpenAI API (for LLM point extraction)
OPENAI_API_KEY=sk-your-key-here

# Whisper STT Configuration
WHISPER_MODEL=base
WHISPER_LANGUAGE=ko
USE_COREML=true

# Force fallback to original whisper (for debugging)
FORCE_FALLBACK=false

# LLM Configuration (LM Studio)
LLM_BASE_URL=http://localhost:1234/v1
LLM_MODEL=qwen/qwen3-vl-4b
LLM_TIMEOUT=12.0
```

**Step 2: Create actual .env file if not exists**

Run:
```bash
cp /Users/song-giung/code/side-project/live-point/backend/.env.example /Users/song-giung/code/side-project/live-point/backend/.env 2>/dev/null || echo ".env already exists"
```

**Step 3: Commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add backend/.env.example
git commit -m "config: add SimulWhisper environment variables"
```

---

## Task 4: Create SimulWhisperService Wrapper

**Files:**
- Create: `backend/simul_whisper_service.py`

**Step 1: Create the service file**

Create `backend/simul_whisper_service.py` with:

```python
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
        args = Namespace(
            log_level="INFO",
            beams=1,  # Greedy decoding for real-time
            decoder="mlx",
            model_path=None,  # Auto-detect
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
```

**Step 2: Verify syntax**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
python -m py_compile simul_whisper_service.py && echo "Syntax OK"
```

Expected: `Syntax OK`

**Step 3: Commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add backend/simul_whisper_service.py
git commit -m "feat: add SimulWhisper streaming service with fallback"
```

---

## Task 5: Modify WebSocket Handler for Streaming

**Files:**
- Modify: `backend/websocket_handler.py`

**Step 1: Replace websocket_handler.py**

Replace entire contents of `backend/websocket_handler.py` with:

```python
"""
WebSocket handler for real-time audio streaming and transcription.
Uses SimulWhisper for low-latency streaming on Apple Silicon.
"""

import json
import logging

from fastapi import WebSocket, WebSocketDisconnect

from llm_service import extract_point_stream
from simul_whisper_service import whisper_service

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for audio streaming.

    Protocol:
    - Binary messages: Audio chunks (16kHz mono int16 PCM)
    - JSON messages:
      - {"type": "pause"}: End of speech, trigger point extraction
      - {"type": "reset"}: Clear buffers and start fresh

    Responses:
    - {"type": "transcript", "text": "...", "partial": true/false}
    - {"type": "point_chunk", "text": "..."}
    - {"type": "point_complete", "source": "...", "point": "..."}
    """
    await manager.connect(websocket)
    transcript_buffer = ""
    whisper_service.reset()

    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data:
                # Audio chunk received - process immediately (streaming)
                text = await whisper_service.feed_audio_async(data["bytes"])

                if text:
                    transcript_buffer += " " + text
                    await websocket.send_json({
                        "type": "transcript",
                        "text": text,
                        "partial": True,
                    })

            elif "text" in data:
                msg = json.loads(data["text"])

                if msg.get("type") == "pause":
                    # End of speech - finalize transcription
                    final_text = await whisper_service.finish_async()
                    if final_text:
                        transcript_buffer += " " + final_text
                        await websocket.send_json({
                            "type": "transcript",
                            "text": final_text,
                            "partial": False,
                        })

                    # Extract point from accumulated transcript
                    if transcript_buffer.strip():
                        point_text = ""
                        async for chunk in extract_point_stream(transcript_buffer):
                            point_text += chunk
                            await websocket.send_json({
                                "type": "point_chunk",
                                "text": chunk,
                            })

                        await websocket.send_json({
                            "type": "point_complete",
                            "source": transcript_buffer.strip(),
                            "point": point_text,
                        })
                        transcript_buffer = ""

                    # Reset for next utterance
                    whisper_service.reset()

                elif msg.get("type") == "reset":
                    # Full reset
                    transcript_buffer = ""
                    whisper_service.reset()

    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

**Step 2: Verify syntax**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
python -m py_compile websocket_handler.py && echo "Syntax OK"
```

Expected: `Syntax OK`

**Step 3: Commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add backend/websocket_handler.py
git commit -m "refactor: switch to streaming STT with SimulWhisper"
```

---

## Task 6: Install SimulWhisper Dependencies

**Files:**
- None (shell commands only)

**Step 1: Install SimulWhisper's own requirements**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend/simul_whisper
pip install -r requirements.txt
```

Expected: All packages install (may take a few minutes for torch/torchaudio)

**Step 2: Install CoreML tools (optional, for acceleration)**

Run:
```bash
pip install coremltools ane_transformers
```

Expected: Packages install successfully

**Step 3: Verify imports work**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
python -c "
import sys
sys.path.insert(0, 'simul_whisper')
from simulstreaming_whisper import simul_asr_factory
print('SimulWhisper import OK')
"
```

Expected: `SimulWhisper import OK`

---

## Task 7: Test Server Startup

**Files:**
- None (verification only)

**Step 1: Start the backend server**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
FORCE_FALLBACK=true uvicorn main:app --reload --port 8000
```

Expected: Server starts without errors. Look for log message about which whisper service is being used.

**Step 2: Test WebSocket endpoint exists**

Run (in another terminal):
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8000/ws
```

Expected: HTTP 101 Switching Protocols (or similar WebSocket upgrade response)

**Step 3: Stop server and commit if needed**

Press `Ctrl+C` to stop server.

---

## Task 8: End-to-End Test

**Files:**
- None (manual testing)

**Step 1: Start backend with SimulWhisper**

Run:
```bash
cd /Users/song-giung/code/side-project/live-point/backend
uvicorn main:app --reload --port 8000
```

Look for: `Using SimulWhisper service (Apple Silicon optimized)` in logs

**Step 2: Start frontend**

Run (in another terminal):
```bash
cd /Users/song-giung/code/side-project/live-point/frontend
npm run dev
```

**Step 3: Test in browser**

1. Open http://localhost:5173
2. Click record button
3. Speak in Korean
4. Verify:
   - Transcription appears in real-time (should be faster than before)
   - Point extraction works after pause

**Step 4: Final commit**

```bash
cd /Users/song-giung/code/side-project/live-point
git add -A
git commit -m "feat: integrate Lightning-SimulWhisper for faster STT"
```

---

## Troubleshooting

### SimulWhisper import fails
- Check if `backend/simul_whisper/` was cloned correctly
- Verify `mlx` is installed: `pip install mlx`

### CoreML not working
- CoreML only works on Apple Silicon (M1/M2/M3)
- Set `USE_COREML=false` in `.env` to disable

### Fallback to original whisper
- Set `FORCE_FALLBACK=true` in `.env`
- Check logs for fallback reason

### Memory issues with large models
- Use `WHISPER_MODEL=base` instead of `medium` or `large`
- Reduce `audio_max_len` in simul_whisper_service.py

---

## Summary

| Before | After |
|--------|-------|
| 2.5s buffering | Real-time streaming |
| openai-whisper | Lightning-SimulWhisper |
| ~3-8s latency | ~500ms latency |
| CPU only | CoreML + Neural Engine |
