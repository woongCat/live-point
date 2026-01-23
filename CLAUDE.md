# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**live-point**는 개인용 실시간 음성 메모 웹앱이다. 말하는 내용을 전사하면서 동시에 "진짜 하고 싶은 말(요지)"을 자동 추출한다.

**3단 UI 구조:**
- 좌측: 과거 세션 기록
- 가운데: 실시간 전사 (더듬거림, 필러 포함 그대로)
- 우측: 요지 추출 (핵심 의도만)

## Architecture

```
Browser (React)
  │
  │ WebSocket (binary audio chunks)
  ▼
FastAPI Backend
  ├── faster-whisper (로컬 STT)
  └── OpenAI API (요지 추출)
```

**Data Flow:**
1. 마이크 → 500ms 청크 → WebSocket 전송
2. 서버에서 2-3초 버퍼 후 Whisper 전사
3. 1.5초 침묵 감지 시 해당 구간을 LLM에 전달
4. LLM이 요지 추출 → 클라이언트로 스트리밍

## Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, WebSocket |
| STT | faster-whisper (로컬, whisper-large-v3) |
| LLM | OpenAI GPT-4o-mini (스트리밍) |
| Frontend | React, TypeScript, Vite |
| 스타일링 | Tailwind CSS |
| 상태관리 | Zustand |
| 로컬저장 | IndexedDB (Dexie.js) |

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Run both (from root)
# TODO: add docker-compose or concurrently script
```

## Project Structure

```
live-point/
├── backend/
│   ├── main.py              # FastAPI 진입점
│   ├── websocket.py         # WebSocket 핸들러
│   ├── whisper_service.py   # faster-whisper 래퍼
│   ├── llm_service.py       # OpenAI 클라이언트
│   └── point_extractor.py   # 요지 추출 로직
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HistoryPanel.tsx
│   │   │   ├── TranscriptFlow.tsx
│   │   │   └── PointPanel.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioCapture.ts
│   │   │   └── useWebSocket.ts
│   │   └── stores/
│   │       └── sessionStore.ts
│   └── package.json
│
└── docs/plans/
```

## Key Design Decisions

- **로컬 Whisper**: 오디오 프라이버시를 위해 STT는 로컬에서 처리
- **클라우드 LLM**: 텍스트는 민감도가 낮으므로 품질 좋은 클라우드 LLM 사용
- **Stateless Backend**: 세션 상태는 프론트엔드(IndexedDB)에서 관리
- **Pause-based Point Extraction**: 모든 텍스트가 아닌 침묵 감지 시에만 LLM 호출
