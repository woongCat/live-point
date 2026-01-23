# live-point Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 실시간 음성 전사 + 요지 추출 웹앱 구현

**Architecture:** FastAPI 백엔드가 WebSocket으로 오디오를 받아 faster-whisper로 전사하고, pause 감지 시 OpenAI API로 요지 추출. React 프론트엔드는 3단 레이아웃 (히스토리 | 전사 | 요지).

**Tech Stack:** Python 3.11+, FastAPI, faster-whisper, OpenAI API, React, TypeScript, Vite, Tailwind, Zustand, Dexie.js

---

## Task 1: Backend 프로젝트 초기화

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/.env.example`

**Step 1: requirements.txt 생성**

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-dotenv==1.0.0
websockets==12.0
faster-whisper==1.0.1
openai==1.12.0
numpy==1.26.3
```

**Step 2: .env.example 생성**

```
OPENAI_API_KEY=sk-your-key-here
WHISPER_MODEL=base
```

**Step 3: main.py 기본 구조 생성**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    return {"status": "ok"}
```

**Step 4: 서버 실행 테스트**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# 브라우저에서 http://localhost:8000/health 확인
```

**Step 5: Commit**

```bash
git init
git add backend/
git commit -m "feat: backend 프로젝트 초기화"
```

---

## Task 2: Whisper 서비스 구현

**Files:**
- Create: `backend/whisper_service.py`
- Modify: `backend/main.py`

**Step 1: whisper_service.py 생성**

```python
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
```

**Step 2: main.py에 import 추가**

```python
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from whisper_service import whisper_service

app = FastAPI(title="live-point")

# ... 기존 CORS 설정 ...

@app.get("/health")
async def health():
    return {"status": "ok", "whisper": "loaded"}
```

**Step 3: 서버 재시작 및 health 확인**

```bash
uvicorn main:app --reload --port 8000
# http://localhost:8000/health → {"status": "ok", "whisper": "loaded"}
```

**Step 4: Commit**

```bash
git add backend/whisper_service.py backend/main.py
git commit -m "feat: faster-whisper 서비스 구현"
```

---

## Task 3: LLM 서비스 (요지 추출) 구현

**Files:**
- Create: `backend/llm_service.py`

**Step 1: llm_service.py 생성**

```python
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """너는 요지 추출기야. 사용자가 말한 내용에서 핵심 의도만 추출해.
- 필러(음, 그러니까, 뭐랄까, 어)와 반복 제거
- 진짜 하고 싶은 말을 1-2문장으로
- 한국어로 응답
- 요지만 출력, 다른 설명 없이"""

async def extract_point(transcript: str) -> str:
    """전사 텍스트에서 요지 추출 (스트리밍)"""
    if not transcript.strip():
        return ""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        max_tokens=150,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()

async def extract_point_stream(transcript: str):
    """전사 텍스트에서 요지 추출 (스트리밍 제너레이터)"""
    if not transcript.strip():
        return

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        max_tokens=150,
        temperature=0.3,
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

**Step 2: Commit**

```bash
git add backend/llm_service.py
git commit -m "feat: OpenAI 요지 추출 서비스 구현"
```

---

## Task 4: WebSocket 핸들러 구현

**Files:**
- Create: `backend/websocket_handler.py`
- Modify: `backend/main.py`

**Step 1: websocket_handler.py 생성**

```python
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
                    # Whisper 전사
                    text = whisper_service.transcribe(buffered)
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
```

**Step 2: main.py에 WebSocket 라우트 추가**

```python
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from whisper_service import whisper_service
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
    return {"status": "ok"}

@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket_endpoint(websocket)
```

**Step 3: Commit**

```bash
git add backend/websocket_handler.py backend/main.py
git commit -m "feat: WebSocket 핸들러 구현 (전사 + 요지 추출)"
```

---

## Task 5: Frontend 프로젝트 초기화

**Files:**
- Create: `frontend/` (Vite + React + TypeScript)

**Step 1: Vite 프로젝트 생성**

```bash
cd /Users/kiwi/Code/side-project/live-point
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Tailwind CSS 설치**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: tailwind.config.js 수정**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 4: src/index.css 수정**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 5: 추가 의존성 설치**

```bash
npm install zustand dexie uuid
npm install -D @types/uuid
```

**Step 6: 개발 서버 테스트**

```bash
npm run dev
# http://localhost:5173 확인
```

**Step 7: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: frontend 프로젝트 초기화 (Vite + React + Tailwind)"
```

---

## Task 6: 타입 정의 및 Zustand 스토어

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/stores/sessionStore.ts`

**Step 1: types.ts 생성**

```typescript
export interface Point {
  id: string;
  timestamp: Date;
  sourceText: string;
  point: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  title: string;
  transcript: string;
  points: Point[];
}

export interface WebSocketMessage {
  type: 'transcript' | 'point_chunk' | 'point_complete' | 'pause' | 'reset';
  text?: string;
  source?: string;
  point?: string;
}
```

**Step 2: sessionStore.ts 생성**

```typescript
import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Session, Point } from '../types';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  currentTranscript: string;
  currentPointText: string;
  isRecording: boolean;

  // Actions
  startNewSession: () => void;
  loadSession: (id: string) => void;
  appendTranscript: (text: string) => void;
  setPointText: (text: string) => void;
  appendPointText: (chunk: string) => void;
  addPoint: (sourceText: string, point: string) => void;
  setRecording: (recording: boolean) => void;
  setSessions: (sessions: Session[]) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  currentTranscript: '',
  currentPointText: '',
  isRecording: false,

  startNewSession: () => {
    const newSession: Session = {
      id: uuid(),
      createdAt: new Date(),
      title: `세션 ${new Date().toLocaleString('ko-KR')}`,
      transcript: '',
      points: [],
    };
    set({
      currentSession: newSession,
      currentTranscript: '',
      currentPointText: '',
    });
  },

  loadSession: (id: string) => {
    const session = get().sessions.find(s => s.id === id);
    if (session) {
      set({
        currentSession: session,
        currentTranscript: session.transcript,
        currentPointText: '',
      });
    }
  },

  appendTranscript: (text: string) => {
    set(state => ({
      currentTranscript: state.currentTranscript + ' ' + text,
      currentSession: state.currentSession ? {
        ...state.currentSession,
        transcript: state.currentSession.transcript + ' ' + text,
      } : null,
    }));
  },

  setPointText: (text: string) => {
    set({ currentPointText: text });
  },

  appendPointText: (chunk: string) => {
    set(state => ({
      currentPointText: state.currentPointText + chunk,
    }));
  },

  addPoint: (sourceText: string, point: string) => {
    const newPoint: Point = {
      id: uuid(),
      timestamp: new Date(),
      sourceText,
      point,
    };
    set(state => ({
      currentPointText: '',
      currentSession: state.currentSession ? {
        ...state.currentSession,
        points: [...state.currentSession.points, newPoint],
      } : null,
    }));
  },

  setRecording: (recording: boolean) => {
    set({ isRecording: recording });
  },

  setSessions: (sessions: Session[]) => {
    set({ sessions });
  },
}));
```

**Step 3: Commit**

```bash
git add frontend/src/types.ts frontend/src/stores/
git commit -m "feat: 타입 정의 및 Zustand 스토어 구현"
```

---

## Task 7: IndexedDB 저장 (Dexie)

**Files:**
- Create: `frontend/src/db.ts`
- Modify: `frontend/src/stores/sessionStore.ts`

**Step 1: db.ts 생성**

```typescript
import Dexie, { type Table } from 'dexie';
import type { Session } from './types';

class LivePointDB extends Dexie {
  sessions!: Table<Session>;

  constructor() {
    super('livepoint');
    this.version(1).stores({
      sessions: 'id, createdAt',
    });
  }
}

export const db = new LivePointDB();

export async function saveSession(session: Session): Promise<void> {
  await db.sessions.put(session);
}

export async function loadAllSessions(): Promise<Session[]> {
  return await db.sessions.orderBy('createdAt').reverse().toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}
```

**Step 2: Commit**

```bash
git add frontend/src/db.ts
git commit -m "feat: IndexedDB 저장소 (Dexie) 구현"
```

---

## Task 8: 오디오 캡처 훅

**Files:**
- Create: `frontend/src/hooks/useAudioCapture.ts`

**Step 1: useAudioCapture.ts 생성**

```typescript
import { useRef, useCallback } from 'react';

interface UseAudioCaptureOptions {
  onAudioData: (data: ArrayBuffer) => void;
  sampleRate?: number;
}

export function useAudioCapture({ onAudioData, sampleRate = 16000 }: UseAudioCaptureOptions) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;
      audioContextRef.current = new AudioContext({ sampleRate });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Float32 → Int16 변환
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        onAudioData(int16Data.buffer);
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;

    } catch (error) {
      console.error('마이크 접근 실패:', error);
      throw error;
    }
  }, [onAudioData, sampleRate]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());

    processorRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
  }, []);

  return { start, stop };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useAudioCapture.ts
git commit -m "feat: 오디오 캡처 훅 구현"
```

---

## Task 9: WebSocket 훅

**Files:**
- Create: `frontend/src/hooks/useWebSocket.ts`

**Step 1: useWebSocket.ts 생성**

```typescript
import { useRef, useCallback, useEffect } from 'react';
import type { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  url: string;
  onTranscript: (text: string) => void;
  onPointChunk: (chunk: string) => void;
  onPointComplete: (source: string, point: string) => void;
}

export function useWebSocket({ url, onTranscript, onPointChunk, onPointComplete }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'transcript':
          if (msg.text) onTranscript(msg.text);
          break;
        case 'point_chunk':
          if (msg.text) onPointChunk(msg.text);
          break;
        case 'point_complete':
          if (msg.source && msg.point) onPointComplete(msg.source, msg.point);
          break;
      }
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
      // 3초 후 재연결 시도
      reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 에러:', error);
    };

    wsRef.current = ws;
  }, [url, onTranscript, onPointChunk, onPointComplete]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const sendAudio = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendPause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pause' }));
    }
  }, []);

  const sendReset = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reset' }));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, disconnect, sendAudio, sendPause, sendReset };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useWebSocket.ts
git commit -m "feat: WebSocket 훅 구현"
```

---

## Task 10: UI 컴포넌트 - HistoryPanel

**Files:**
- Create: `frontend/src/components/HistoryPanel.tsx`

**Step 1: HistoryPanel.tsx 생성**

```typescript
import { useSessionStore } from '../stores/sessionStore';

export function HistoryPanel() {
  const { sessions, currentSession, loadSession, startNewSession } = useSessionStore();

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={startNewSession}
          className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          + 새 세션
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => loadSession(session.id)}
            className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
              currentSession?.id === session.id ? 'bg-blue-50' : ''
            }`}
          >
            <div className="text-sm font-medium text-gray-900 truncate">
              {session.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(session.createdAt).toLocaleDateString('ko-KR')}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              • {session.points.length} points
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center">
            저장된 세션이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/HistoryPanel.tsx
git commit -m "feat: HistoryPanel 컴포넌트 구현"
```

---

## Task 11: UI 컴포넌트 - TranscriptFlow

**Files:**
- Create: `frontend/src/components/TranscriptFlow.tsx`

**Step 1: TranscriptFlow.tsx 생성**

```typescript
import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/sessionStore';

export function TranscriptFlow() {
  const { currentTranscript, isRecording } = useSessionStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentTranscript]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-700">실시간 전사</h2>
        {isRecording && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-red-500">녹음중</span>
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 p-4 overflow-y-auto"
      >
        {currentTranscript ? (
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {currentTranscript}
            {isRecording && <span className="animate-pulse">▌</span>}
          </p>
        ) : (
          <p className="text-gray-400 text-center mt-8">
            녹음을 시작하면 전사 내용이 여기에 표시됩니다
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/TranscriptFlow.tsx
git commit -m "feat: TranscriptFlow 컴포넌트 구현"
```

---

## Task 12: UI 컴포넌트 - PointPanel

**Files:**
- Create: `frontend/src/components/PointPanel.tsx`

**Step 1: PointPanel.tsx 생성**

```typescript
import { useSessionStore } from '../stores/sessionStore';

export function PointPanel() {
  const { currentSession, currentPointText } = useSessionStore();

  const copyToClipboard = () => {
    if (!currentSession) return;
    const text = currentSession.points.map(p => `• ${p.point}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const exportMarkdown = () => {
    if (!currentSession) return;
    const md = `# ${currentSession.title}\n\n${currentSession.points
      .map(p => `- ${p.point}`)
      .join('\n')}`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700">요지 (The Point)</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {currentSession?.points.map((point, index) => (
          <div
            key={point.id}
            className="p-3 bg-white rounded-lg shadow-sm border border-gray-100 animate-fade-in"
          >
            <p className="text-gray-800 text-sm">{point.point}</p>
            <p className="text-xs text-gray-400 mt-2 truncate">
              원문: {point.sourceText.slice(0, 50)}...
            </p>
          </div>
        ))}

        {/* 현재 생성 중인 요지 */}
        {currentPointText && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
            <p className="text-blue-800 text-sm">{currentPointText}</p>
          </div>
        )}

        {!currentSession?.points.length && !currentPointText && (
          <p className="text-gray-400 text-center text-sm mt-8">
            말을 멈추면 요지가 여기에 나타납니다
          </p>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={copyToClipboard}
          disabled={!currentSession?.points.length}
          className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          복사
        </button>
        <button
          onClick={exportMarkdown}
          disabled={!currentSession?.points.length}
          className="flex-1 py-2 px-3 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          내보내기
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/PointPanel.tsx
git commit -m "feat: PointPanel 컴포넌트 구현"
```

---

## Task 13: App 컴포넌트 통합

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/RecordButton.tsx`

**Step 1: RecordButton.tsx 생성**

```typescript
import { useSessionStore } from '../stores/sessionStore';

interface RecordButtonProps {
  onStart: () => void;
  onStop: () => void;
}

export function RecordButton({ onStart, onStop }: RecordButtonProps) {
  const { isRecording, setRecording, currentSession, startNewSession } = useSessionStore();

  const handleClick = () => {
    if (isRecording) {
      setRecording(false);
      onStop();
    } else {
      if (!currentSession) {
        startNewSession();
      }
      setRecording(true);
      onStart();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        isRecording
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {isRecording ? '⏹ 중지' : '🎤 녹음'}
    </button>
  );
}
```

**Step 2: App.tsx 수정**

```typescript
import { useEffect, useCallback, useRef } from 'react';
import { HistoryPanel } from './components/HistoryPanel';
import { TranscriptFlow } from './components/TranscriptFlow';
import { PointPanel } from './components/PointPanel';
import { RecordButton } from './components/RecordButton';
import { useSessionStore } from './stores/sessionStore';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useWebSocket } from './hooks/useWebSocket';
import { loadAllSessions, saveSession } from './db';

const WS_URL = 'ws://localhost:8000/ws';
const PAUSE_THRESHOLD_MS = 1500;

function App() {
  const {
    currentSession,
    appendTranscript,
    appendPointText,
    addPoint,
    setSessions,
  } = useSessionStore();

  const lastAudioTimeRef = useRef<number>(Date.now());
  const pauseTimerRef = useRef<number>();

  const { connect, disconnect, sendAudio, sendPause } = useWebSocket({
    url: WS_URL,
    onTranscript: (text) => {
      appendTranscript(text);
      lastAudioTimeRef.current = Date.now();
    },
    onPointChunk: (chunk) => {
      appendPointText(chunk);
    },
    onPointComplete: (source, point) => {
      addPoint(source, point);
    },
  });

  const handleAudioData = useCallback((data: ArrayBuffer) => {
    sendAudio(data);
    lastAudioTimeRef.current = Date.now();

    // 침묵 감지 타이머 리셋
    clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      sendPause();
    }, PAUSE_THRESHOLD_MS);
  }, [sendAudio, sendPause]);

  const { start: startCapture, stop: stopCapture } = useAudioCapture({
    onAudioData: handleAudioData,
  });

  const handleStart = async () => {
    connect();
    await startCapture();
  };

  const handleStop = () => {
    clearTimeout(pauseTimerRef.current);
    stopCapture();
    sendPause(); // 마지막 요지 추출
  };

  // 세션 로드
  useEffect(() => {
    loadAllSessions().then(setSessions);
  }, [setSessions]);

  // 세션 자동 저장
  useEffect(() => {
    if (currentSession) {
      saveSession(currentSession);
    }
  }, [currentSession]);

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h1 className="text-xl font-bold text-gray-800">live-point</h1>
        <RecordButton onStart={handleStart} onStop={handleStop} />
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        <HistoryPanel />
        <TranscriptFlow />
        <PointPanel />
      </main>
    </div>
  );
}

export default App;
```

**Step 3: index.css에 애니메이션 추가**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: App 컴포넌트 통합 및 RecordButton 구현"
```

---

## Task 14: 전체 연동 테스트

**Step 1: Backend 실행**

```bash
cd backend
source venv/bin/activate
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 설정
uvicorn main:app --reload --port 8000
```

**Step 2: Frontend 실행**

```bash
cd frontend
npm run dev
```

**Step 3: 브라우저에서 테스트**

1. http://localhost:5173 접속
2. "새 세션" 클릭
3. "녹음" 버튼 클릭
4. 마이크 권한 허용
5. 말하기 → 가운데 전사 확인
6. 잠시 멈춤 → 우측에 요지 생성 확인

**Step 4: 최종 Commit**

```bash
git add .
git commit -m "feat: live-point v0.1 완성"
```
