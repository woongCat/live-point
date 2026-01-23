# live-point 구현 진행 기록

## 2026-01-23

### Batch 1 (Tasks 1-3) - Backend 핵심 서비스

| Task | 상태 | 커밋 |
|------|------|------|
| Task 1: Backend 프로젝트 초기화 | ✅ 완료 | `8145240` |
| Task 2: Whisper 서비스 구현 | ✅ 완료 | `bc3f106` |
| Task 3: LLM 서비스 구현 | ✅ 완료 | `a557f88` |

**생성된 파일:**
- `backend/requirements.txt` - Python 의존성 (FastAPI, faster-whisper, OpenAI 등)
- `backend/.env.example` - 환경변수 템플릿
- `backend/main.py` - FastAPI 앱 진입점
- `backend/whisper_service.py` - faster-whisper 래퍼 (한국어 전사)
- `backend/llm_service.py` - OpenAI GPT-4o-mini 요지 추출 (스트리밍 지원)

**참고:**
- `requirements.txt`를 `faster-whisper>=1.1.0`으로 업데이트 (ffmpeg 8 호환)
- uv로 패키지 관리

---

### Batch 2 (Tasks 4-6) - WebSocket + Frontend 초기화

| Task | 상태 | 커밋 |
|------|------|------|
| Task 4: WebSocket 핸들러 구현 | ✅ 완료 | `be761a2` |
| Task 5: Frontend 프로젝트 초기화 | ✅ 완료 | `0e1ba21` |
| Task 6: 타입 정의 및 Zustand 스토어 | ✅ 완료 | `c0fd571` |

**생성된 파일:**
- `backend/websocket_handler.py` - AudioBuffer, ConnectionManager, WebSocket 엔드포인트
- `frontend/` - Vite + React + TypeScript 프로젝트
- `frontend/src/types.ts` - Session, Point, WebSocketMessage 타입
- `frontend/src/stores/sessionStore.ts` - Zustand 상태 관리

**참고:**
- Node.js v22.22.0으로 업그레이드 (Vite 7 호환)
- Tailwind CSS v3 사용

---

### 남은 작업 (Tasks 7-14)

#### Task 7: IndexedDB 저장 (Dexie) ⏳
**파일:** `frontend/src/db.ts`
- Dexie 클래스로 `livepoint` DB 생성
- `sessions` 테이블 (id, createdAt 인덱스)
- `saveSession()`, `loadAllSessions()`, `deleteSession()` 함수

#### Task 8: 오디오 캡처 훅 ⏳
**파일:** `frontend/src/hooks/useAudioCapture.ts`
- `navigator.mediaDevices.getUserMedia()` 로 마이크 접근
- `ScriptProcessorNode`로 오디오 처리
- Float32 → Int16 변환 후 콜백 전달
- 16kHz mono PCM 출력

#### Task 9: WebSocket 훅 ⏳
**파일:** `frontend/src/hooks/useWebSocket.ts`
- `ws://localhost:8000/ws` 연결 관리
- `onTranscript`, `onPointChunk`, `onPointComplete` 콜백
- `sendAudio()`, `sendPause()`, `sendReset()` 메서드
- 자동 재연결 (3초 후)

#### Task 10: HistoryPanel ⏳
**파일:** `frontend/src/components/HistoryPanel.tsx`
- 좌측 사이드바 (w-64)
- "새 세션" 버튼
- 세션 목록 (제목, 날짜, 포인트 개수)
- 클릭 시 세션 로드

#### Task 11: TranscriptFlow ⏳
**파일:** `frontend/src/components/TranscriptFlow.tsx`
- 가운데 메인 영역
- 실시간 전사 텍스트 표시
- 녹음 중 표시 (빨간 점 + 커서)
- 자동 스크롤

#### Task 12: PointPanel ⏳
**파일:** `frontend/src/components/PointPanel.tsx`
- 우측 사이드바 (w-80)
- 추출된 요지 카드 목록
- 생성 중인 요지 (파란색 배경)
- 복사 / 내보내기 버튼

#### Task 13: App 컴포넌트 통합 ⏳
**파일:**
- `frontend/src/components/RecordButton.tsx` - 녹음 시작/중지 버튼
- `frontend/src/App.tsx` - 전체 레이아웃 조립

**구조:**
```
┌─────────────────────────────────────────────────┐
│ Header: live-point [RecordButton]              │
├──────────┬────────────────────┬─────────────────┤
│ History  │   TranscriptFlow   │   PointPanel   │
│ Panel    │                    │                │
│ (w-64)   │     (flex-1)       │    (w-80)      │
└──────────┴────────────────────┴─────────────────┘
```

- 침묵 감지 (1.5초) → `sendPause()` 호출
- 세션 자동 저장 (IndexedDB)

#### Task 14: 전체 연동 테스트 ⏳
1. Backend 실행: `uvicorn main:app --reload --port 8000`
2. Frontend 실행: `npm run dev`
3. 브라우저에서 http://localhost:5173 접속
4. 테스트 시나리오:
   - 새 세션 생성
   - 녹음 시작 → 마이크 권한 허용
   - 말하기 → 가운데 전사 확인
   - 잠시 멈춤 → 우측에 요지 생성 확인
   - 녹음 중지
   - 세션 목록에서 이전 세션 로드

---

## 환경 설정

```bash
# Backend
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env  # OPENAI_API_KEY 설정 필요
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## 검증된 엔드포인트

- `GET /health` → `{"status":"ok","whisper":"loaded"}`
- `WS /ws` → 오디오 스트리밍 + 전사 + 요지 추출
