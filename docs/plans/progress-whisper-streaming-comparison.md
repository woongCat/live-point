# Whisper 스트리밍 솔루션 비교 테스트 결과

## Status: Complete ✅

**날짜:** 2026-01-24
**목표:** Lightning-SimulWhisper와 WhisperLiveKit 두 솔루션을 비교하여 최적의 실시간 STT 선택

---

## 완료된 작업

### Task 1: Lightning-SimulWhisper 완료 ✅

**결과:**
- MLX 모델 (`mlx-community/whisper-large-v3-turbo`) 완전히 캐시됨 (~1.5GB)
- 서버 포트 8000에서 정상 실행
- Health 엔드포인트 확인: `{"status":"ok","whisper_service":"SimulWhisperService"}`

**이슈:**
- CoreML 인코더 불완전 (Manifest.json 없음) → MLX 폴백으로 정상 동작
- 로그: `Failed to initialize CoreML encoder... Falling back to MLX encoder`

### Task 2: WhisperLiveKit 설치 및 테스트 ✅

**설치:**
```bash
uv pip install whisperlivekit mlx-whisper
```

**버전:**
- whisperlivekit: 0.2.17.post1
- mlx-whisper: 0.4.3

**실행:**
```bash
python3 -m whisperlivekit.basic_server --port 8001 --model large-v3-turbo --lan ko --backend mlx-whisper
```

**결과:**
- 포트 8001에서 정상 실행
- 내장 Web UI 제공 (`http://localhost:8001/`)
- WebSocket 엔드포인트: `/asr`

### Task 3: 성능 비교 ✅

| 측정 항목 | Lightning-SimulWhisper | WhisperLiveKit |
|----------|------------------------|----------------|
| **메모리 (대기)** | 16 MB | 255 MB |
| **메모리 (로딩 후)** | ~2 GB | ~2 GB |
| **모델 로딩** | Lazy (첫 요청 시) | Eager (시작 시) |
| **스트리밍 알고리즘** | SimulWhisper | SimulWhisper (동일!) |
| **백엔드** | MLX | MLX |
| **WebSocket 경로** | `/ws` | `/asr` |
| **내장 Web UI** | 없음 | 있음 |
| **LLM 통합** | ✅ 포함됨 | ❌ 추가 필요 |
| **설치 복잡도** | 높음 (수동) | 낮음 (pip) |

**핵심 발견:**
WhisperLiveKit은 내부적으로 **동일한 SimulWhisper 알고리즘**을 사용함
- 경로: `.venv/lib/python3.11/site-packages/whisperlivekit/simul_whisper/`
- 전사 성능은 동일할 것으로 예상

### Task 4: 최종 선택 및 통합 ✅

**선택: Lightning-SimulWhisper 유지**

**이유:**
1. **동일한 알고리즘** - WhisperLiveKit도 SimulWhisper 사용, 전사 품질 동일
2. **이미 통합됨** - `websocket_handler.py`에 LLM 요지 추출까지 완성
3. **리팩토링 불필요** - WhisperLiveKit 사용 시 WebSocket 프로토콜 재작성 필요
4. **낮은 대기 메모리** - Lazy loading으로 16MB vs 255MB

---

## 결론

| 구분 | 상태 |
|------|------|
| 비교 테스트 | ✅ 완료 |
| 추천 | Lightning-SimulWhisper 유지 |
| 코드 변경 | 없음 |

### WhisperLiveKit을 고려할 상황
- 기존 통합 없이 새 프로젝트 시작 시
- 디버깅용 내장 Web UI 필요 시
- pip으로 자동 업데이트 선호 시

### 현재 상태
```bash
curl localhost:8000/health
# {"status":"ok","whisper_service":"SimulWhisperService"}
```

### 선택적 후속 작업
1. CoreML 인코더 재생성: `./scripts/generate_coreml_encoder.sh`
2. 프론트엔드 WebSocket 연결 테스트
3. WhisperLiveKit 패키지 정리 (필요 없으면): `uv pip uninstall whisperlivekit`

---

## 참고 파일

| 파일 | 역할 |
|------|------|
| `backend/simul_whisper_service.py` | Lightning-SimulWhisper 래퍼 |
| `backend/websocket_handler.py` | WebSocket + LLM 통합 핸들러 |
| `backend/.env` | 모델 설정 (large-v3-turbo, ko) |
