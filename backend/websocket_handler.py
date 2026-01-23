import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from whisper_service import whisper_service
from llm_service import extract_point_stream

class AudioBuffer:
    def __init__(self, threshold_seconds: float = 2.5, sample_rate: int = 16000):
        self.buffer = bytearray()
        self.threshold_bytes = int(threshold_seconds * sample_rate * 2)  # 16-bit = 2 bytes
        self.silence_threshold = 1.5  # seconds
        self.last_voice_time = 0

    def add(self, chunk: bytes) -> bytes | None:
        self.buffer.extend(chunk)
        if len(self.buffer) >= self.threshold_bytes:
            data = bytes(self.buffer)
            self.buffer.clear()
            return data
        return None

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    audio_buffer = AudioBuffer()
    transcript_buffer = ""

    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data:
                # 오디오 데이터 수신
                audio_chunk = data["bytes"]
                buffered = audio_buffer.add(audio_chunk)

                if buffered:
                    # Whisper 전사 (비동기)
                    text = await whisper_service.transcribe_async(buffered)
                    if text:
                        transcript_buffer += " " + text
                        await websocket.send_json({
                            "type": "transcript",
                            "text": text
                        })

            elif "text" in data:
                msg = json.loads(data["text"])

                if msg.get("type") == "pause":
                    # 침묵 감지 → 요지 추출
                    if transcript_buffer.strip():
                        point_text = ""
                        async for chunk in extract_point_stream(transcript_buffer):
                            point_text += chunk
                            await websocket.send_json({
                                "type": "point_chunk",
                                "text": chunk
                            })

                        await websocket.send_json({
                            "type": "point_complete",
                            "source": transcript_buffer.strip(),
                            "point": point_text
                        })
                        transcript_buffer = ""

                elif msg.get("type") == "reset":
                    transcript_buffer = ""
                    audio_buffer.buffer.clear()

    except WebSocketDisconnect:
        manager.disconnect(websocket)
