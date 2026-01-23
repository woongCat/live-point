import asyncio
import os
import numpy as np
import whisper

class WhisperService:
    def __init__(self):
        model_size = os.getenv("WHISPER_MODEL", "medium")
        self.model = whisper.load_model(model_size)

    def transcribe(self, audio_data: bytes) -> str:
        """16kHz mono PCM 바이트를 텍스트로 변환"""
        if not audio_data:
            return ""

        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        result = self.model.transcribe(
            audio_np,
            language="ko",
            task="transcribe",
            fp16=False,
            condition_on_previous_text=False,
            no_speech_threshold=0.6,
        )

        text = result.get("text", "")
        return text.strip()

    async def transcribe_async(self, audio_data: bytes) -> str:
        """비동기 전사"""
        return await asyncio.to_thread(self.transcribe, audio_data)

whisper_service = WhisperService()
