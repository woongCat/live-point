"""
WhisperLiveKit integration for live-point backend.
Uses AudioProcessor for real-time transcription with live-point protocol.
"""

import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from whisperlivekit import AudioProcessor, TranscriptionEngine

from llm_service import extract_point_stream

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global engine (singleton)
transcription_engine = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize TranscriptionEngine on startup."""
    global transcription_engine
    logger.info("Initializing TranscriptionEngine...")
    transcription_engine = TranscriptionEngine(
        model_size=os.getenv("WHISPER_MODEL", "large-v3-turbo"),
        lan=os.getenv("WHISPER_LANGUAGE", "ko"),
        backend=os.getenv("WHISPER_BACKEND", "mlx-whisper"),
        pcm_input=True,  # Direct 16kHz INT16 PCM input
    )
    logger.info("TranscriptionEngine initialized")
    yield


app = FastAPI(title="live-point", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "whisper_service": "WhisperLiveKit"}


@app.websocket("/ws")
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
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    # Create AudioProcessor for this connection
    processor = AudioProcessor(
        transcription_engine=transcription_engine,
        pcm_input=True,
    )

    # Track accumulated transcript for point extraction
    transcript_buffer = ""
    last_confirmed_text = ""

    # Start processing tasks
    results_generator = await processor.create_tasks()

    # Task to read transcription results and send to client
    async def send_transcriptions():
        nonlocal transcript_buffer, last_confirmed_text
        try:
            async for front_data in results_generator:
                # Convert FrontData to live-point protocol

                # Send confirmed lines (non-partial)
                if front_data.lines:
                    full_text = " ".join(line.text for line in front_data.lines if line.text)
                    if full_text and full_text != last_confirmed_text:
                        # Extract new portion
                        new_text = full_text
                        if last_confirmed_text and full_text.startswith(last_confirmed_text):
                            new_text = full_text[len(last_confirmed_text):].strip()

                        if new_text:
                            transcript_buffer += " " + new_text
                            await websocket.send_json({
                                "type": "transcript",
                                "text": new_text,
                                "partial": False,
                            })
                        last_confirmed_text = full_text

                # Send buffer (partial)
                if front_data.buffer_transcription:
                    await websocket.send_json({
                        "type": "transcript",
                        "text": front_data.buffer_transcription,
                        "partial": True,
                    })

        except asyncio.CancelledError:
            logger.info("Transcription sender cancelled")
        except Exception as e:
            logger.error(f"Error in transcription sender: {e}")

    send_task = asyncio.create_task(send_transcriptions())

    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data:
                # Audio chunk - feed to processor
                await processor.process_audio(data["bytes"])

            elif "text" in data:
                msg = json.loads(data["text"])

                if msg.get("type") == "pause":
                    # Signal end of audio stream to processor
                    await processor.process_audio(None)

                    # Wait a moment for final transcriptions to process
                    await asyncio.sleep(0.3)

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

                    # Cleanup and prepare for next utterance
                    send_task.cancel()
                    try:
                        await send_task
                    except asyncio.CancelledError:
                        pass
                    await processor.cleanup()

                    # Reset state for next utterance
                    transcript_buffer = ""
                    last_confirmed_text = ""
                    processor = AudioProcessor(
                        transcription_engine=transcription_engine,
                        pcm_input=True,
                    )
                    results_generator = await processor.create_tasks()
                    send_task = asyncio.create_task(send_transcriptions())

                elif msg.get("type") == "reset":
                    # Full reset
                    send_task.cancel()
                    try:
                        await send_task
                    except asyncio.CancelledError:
                        pass
                    await processor.cleanup()

                    transcript_buffer = ""
                    last_confirmed_text = ""
                    processor = AudioProcessor(
                        transcription_engine=transcription_engine,
                        pcm_input=True,
                    )
                    results_generator = await processor.create_tasks()
                    send_task = asyncio.create_task(send_transcriptions())

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        send_task.cancel()
        try:
            await send_task
        except asyncio.CancelledError:
            pass
        await processor.cleanup()
        logger.info("WebSocket connection closed")
