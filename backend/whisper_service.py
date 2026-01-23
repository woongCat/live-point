import os
import numpy as np
from faster_whisper import WhisperModel

class WhisperService:
    def __init__(self):
        model_size = os.getenv("WHISPER_MODEL", "base")
        self.model = WhisperModel(
            model_size,
            device="cpu",
            compute_type="int8"
        )

    def transcribe(self, audio_data: bytes) -> str:
        """16kHz mono PCM 바이트를 텍스트로 변환"""
        audio_np = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0

        segments, _ = self.model.transcribe(
            audio_np,
            language="ko",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        text = " ".join([seg.text for seg in segments])
        return text.strip()

whisper_service = WhisperService()
