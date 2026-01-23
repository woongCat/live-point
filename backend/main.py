from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from websocket_handler import websocket_endpoint

app = FastAPI(title="live-point")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    from simul_whisper_service import whisper_service
    service_type = type(whisper_service).__name__
    return {"status": "ok", "whisper_service": service_type}


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket_endpoint(websocket)
