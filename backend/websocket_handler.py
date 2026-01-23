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
