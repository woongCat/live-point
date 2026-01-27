# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**live-point**는 개인용 실시간 음성 메모 웹앱이다. 말하는 내용을 전사하면서 동시에 "진짜 하고 싶은 말(요지)"을 자동 추출한다.

**3단 UI 구조:**
- 좌측: 과거 세션 기록 (HistoryPanel)
- 가운데: 실시간 전사 (TranscriptFlow)
- 우측: 요지 추출 (PointPanel)

**부가 기능:** 쓰레기 던지기 미니게임 (녹음과 독립), AdSense 광고

## Architecture

```
Browser (React + Vite)
  │
  │ WebSocket (binary audio chunks / JSON control)
  ▼
FastAPI Backend
  ├── WhisperLiveKit / mlx-whisper (로컬 STT)
  └── OpenAI-compatible LLM (요지 추출, 기본: LM Studio localhost:1234)
```

**Data Flow:**
1. 마이크 → 16kHz mono int16 PCM → 500ms 청크 → WebSocket binary 전송
2. 서버에서 버퍼링 후 Whisper 전사 → `{type: "transcript"}` 응답
3. 1.5초 침묵 감지 시 `{type: "pause"}` 전송 → LLM 요지 추출
4. LLM 결과를 `point_chunk` (스트리밍) → `point_complete` 로 응답

**WebSocket Protocol:**
- Client → Server: binary (audio) | `{"type": "pause"}` | `{"type": "reset"}`
- Server → Client: `{"type": "transcript", "text", "partial"}` | `{"type": "point_chunk", "text"}` | `{"type": "point_complete", "source", "point"}`

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Vite preview
```

## Key Architecture Details

### State Management (Zustand)
- **sessionStore**: 세션 목록, 현재 세션, 전사/요지 텍스트, 녹음 상태. `startNewSession(name?)` 으로 세션 생성.
- **gameStore**: 게임 상태(idle→consent→playing→ended), 물리 오브젝트(trash/bin), 파워/충전, 점수/스테이지. 5단계 난이도.

### Custom Hooks
- **useAudioCapture**: 마이크 → AudioWorklet → PCM ArrayBuffer 변환
- **useWebSocket**: WebSocket 연결, binary/JSON 메시지 처리
- **useSilenceDetection**: 타이머 기반 무음 감지 (게임 자동 종료에 사용)
- **useDraggable**: 마우스 드래그 (`.drag-handle` 클래스 요소에서만 시작, 화면 경계 제한)

### Frontend Data Persistence
- IndexedDB via Dexie.js (`db.ts`): 세션을 로컬에 자동 저장/불러오기
- 백엔드는 stateless, 모든 세션 상태는 프론트엔드에서 관리

### Game Subsystem (`components/game/`)
- 캔버스 기반 물리 시뮬레이션 (600x400)
- 스페이스바 꾹 눌러 파워 충전 → 떼면 55° 각도 발사
- 5단계 스테이지 (300점마다 승급, 빈 크기 감소/속도 증가)
- 게임 창은 우측 하단에 표시되며 드래그 이동 가능

### Backend Variants
- `main.py`: WhisperLiveKit + mlx-whisper (기본, Apple Silicon 최적화)
- `websocket_handler.py`: SimulWhisper 대안 구현
- `whisper_service.py`: OpenAI Whisper 폴백

### Environment Variables (backend)
- `WHISPER_MODEL`, `WHISPER_LANGUAGE`, `WHISPER_BACKEND`
- `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT`
- `VITE_ADSENSE_CLIENT_ID` (frontend)

## Key Design Decisions

- **로컬 Whisper**: 오디오 프라이버시를 위해 STT는 로컬에서 처리
- **클라우드 LLM**: 텍스트는 민감도가 낮으므로 품질 좋은 클라우드 LLM 사용
- **Stateless Backend**: 세션 상태는 프론트엔드(IndexedDB)에서 관리
- **Pause-based Point Extraction**: 모든 텍스트가 아닌 침묵 감지 시에만 LLM 호출
- **게임/녹음 분리**: 게임 시작 버튼과 녹음 버튼이 독립적으로 동작
- **세션 이름 모달**: 새 세션 시작 시 이름 입력 (선택, 빈 값이면 자동 생성)
