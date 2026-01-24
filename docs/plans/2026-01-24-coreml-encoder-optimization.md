# CoreML 인코더 최적화 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** large-v3-turbo 모델 + CoreML 인코더로 SimulWhisper 최적화

**Architecture:** whisper.cpp로 CoreML 모델 생성 → Neural Engine 가속 → 실시간 전사

**Tech Stack:** whisper.cpp, CoreML, large-v3-turbo, Apple Neural Engine

---

# Part 1: 사전 지식 습득 (구현 전 필수)

## 학습 목표 체크리스트

아래 질문에 답할 수 있어야 구현을 검증할 수 있습니다.

### 📚 개념 이해 확인

#### Q1. Whisper 아키텍처
```
질문: Whisper의 두 가지 주요 컴포넌트는?
정답: 인코더(Encoder)와 디코더(Decoder)

질문: 어느 부분이 더 무거운가?
정답: 인코더 (오디오 → 벡터 변환, 대부분의 연산)

질문: turbo 모델이 빠른 이유는?
정답: 디코더 레이어를 32개 → 4개로 줄임 (distillation)
```

#### Q2. 하드웨어 가속
```
질문: Apple Silicon의 Neural Engine이란?
정답: 행렬 연산 전용 하드웨어 (AI 가속기)

질문: CoreML의 역할은?
정답: Neural Engine에서 모델을 실행할 수 있게 변환/최적화

질문: MLX vs CoreML 차이는?
정답: MLX = CPU/GPU 사용, CoreML = Neural Engine 사용 (더 빠름)
```

#### Q3. 파일 형식
```
질문: .mlpackage 파일이란?
정답: CoreML 모델 패키지 (Neural Engine용으로 변환된 모델)

질문: .mlmodelc란?
정답: 컴파일된 CoreML 모델 (첫 실행 시 자동 생성)

질문: ggml- 접두사 파일들이란?
정답: whisper.cpp의 양자화된 모델 형식
```

#### Q4. 경로와 탐지
```
질문: SimulWhisper가 CoreML 모델을 찾는 경로는?
정답:
  - backend/models/
  - backend/simul_whisper/models/
  - backend/simul_whisper/whisper.cpp/models/

질문: CoreML 모델 파일명 패턴은?
정답: coreml-encoder-{모델명}.mlpackage
```

---

## 🧪 실습 검증 질문 (구현 중 사용)

### Task 1 검증: whisper.cpp 클론
```bash
# 당신이 확인할 명령어:
ls backend/simul_whisper/whisper.cpp/models/generate-coreml-model.sh

# 예상 결과: 파일이 존재해야 함
# 실패 시: 클론이 제대로 안 된 것
```

**검증 질문:**
- [ ] `whisper.cpp/models/` 폴더 안에 `generate-coreml-model.sh`가 있는가?
- [ ] `whisper.cpp/README.md`가 존재하는가?

---

### Task 2 검증: 의존성
```bash
# 당신이 확인할 명령어:
python3 -c "import coremltools; import ane_transformers; import whisper; print('OK')"

# 예상 결과: OK
# 실패 시: 해당 패키지 설치 필요
```

**검증 질문:**
- [ ] `coremltools` import 성공?
- [ ] `ane_transformers` import 성공?
- [ ] `whisper` (openai-whisper) import 성공?

---

### Task 3 검증: CoreML 모델 생성
```bash
# 당신이 확인할 명령어:
ls -la backend/simul_whisper/whisper.cpp/models/ | grep -E "coreml|mlpackage"

# 예상 결과: coreml-encoder-large-v3-turbo.mlpackage 폴더 존재
# 실패 시: 생성 스크립트 실패 또는 모델명 오류
```

**검증 질문:**
- [ ] `coreml-encoder-large-v3-turbo.mlpackage/` 디렉토리가 존재하는가?
- [ ] 해당 폴더 크기가 0이 아닌가? (최소 수백 MB)
- [ ] 폴더 안에 `Manifest.json`이 있는가?

**예상 폴더 구조:**
```
coreml-encoder-large-v3-turbo.mlpackage/
├── Manifest.json
├── Data/
│   └── com.apple.CoreML/
│       └── model.mlmodel
└── ...
```

---

### Task 4 검증: 경로 설정
```bash
# 당신이 확인할 명령어:
ls -la backend/simul_whisper/models/

# 예상 결과: coreml-encoder-large-v3-turbo.mlpackage 심볼릭 링크
```

**검증 질문:**
- [ ] 심볼릭 링크가 올바른 경로를 가리키는가?
- [ ] `ls -la`에서 `->` 표시가 보이는가?

---

### Task 5 검증: 서버 시작
```bash
# 당신이 확인할 로그:
uvicorn main:app --port 8000

# 성공 로그 (이것이 보여야 함):
"Loading CoreML encoder from ..."
"INFO: Application startup complete"

# 실패 로그 (이것이 보이면 안 됨):
"Failed to initialize CoreML encoder"
"Falling back to MLX encoder"
```

**검증 질문:**
- [ ] "Loading CoreML encoder" 메시지가 보이는가?
- [ ] "Falling back" 메시지가 없는가?
- [ ] Health 체크 결과가 `SimulWhisperService`인가?

```bash
curl http://localhost:8000/health
# 예상: {"status":"ok","whisper_service":"SimulWhisperService"}
```

---

### Task 6 검증: 성능 테스트
```
# 체감 테스트:
1. 프론트엔드에서 녹음 시작
2. 말하기 시작
3. 텍스트가 나타나는 시간 측정

# 기대값:
- CoreML 이전: 말하고 ~1초 후 텍스트 표시
- CoreML 이후: 말하고 ~0.2초 후 텍스트 표시
```

**검증 질문:**
- [ ] 체감 지연이 확실히 줄었는가?
- [ ] 한국어 인식 품질이 유지되는가?

---

# Part 2: 구현 단계

## Task 1: whisper.cpp 클론

**Files:**
- Create: `backend/simul_whisper/whisper.cpp/`

**Step 1:**
```bash
rm -rf /Users/song-giung/code/side-project/live-point/backend/simul_whisper/whisper.cpp
```

**Step 2:**
```bash
cd /Users/song-giung/code/side-project/live-point/backend/simul_whisper
git clone https://github.com/ggml-org/whisper.cpp.git
```

**Step 3: 검증**
```bash
ls backend/simul_whisper/whisper.cpp/models/generate-coreml-model.sh
# 파일이 존재해야 함
```

---

## Task 2: 의존성 확인

**Step 1:**
```bash
python3 -c "import coremltools; import ane_transformers; import whisper; print('All dependencies OK')"
```

누락된 패키지가 있으면:
```bash
pip install coremltools ane_transformers openai-whisper
```

---

## Task 3: CoreML 모델 생성 (large-v3-turbo)

**Files:**
- Create: `backend/simul_whisper/whisper.cpp/models/coreml-encoder-large-v3-turbo.mlpackage/`

**Step 1:**
```bash
cd /Users/song-giung/code/side-project/live-point/backend/simul_whisper/whisper.cpp/models
chmod +x generate-coreml-model.sh
./generate-coreml-model.sh large-v3-turbo
```

⚠️ **중요**: 30분-1시간 소요 가능. 메모리 8GB+ 필요.

**Step 2: 검증**
```bash
ls -la backend/simul_whisper/whisper.cpp/models/ | grep coreml
# coreml-encoder-large-v3-turbo.mlpackage 폴더가 보여야 함
```

---

## Task 4: simul_whisper_service.py 수정

**Files:**
- Modify: `backend/simul_whisper_service.py`

**변경 내용:**
```python
# 기존 (line 51):
model_path = f"mlx-community/whisper-{self.model_name}-mlx"

# 변경:
model_path = "mlx-community/whisper-large-v3-turbo-mlx"
```

**그리고 .env 파일:**
```env
WHISPER_MODEL=large-v3-turbo
```

---

## Task 5: 심볼릭 링크 생성

```bash
mkdir -p /Users/song-giung/code/side-project/live-point/backend/simul_whisper/models

ln -s ../whisper.cpp/models/coreml-encoder-large-v3-turbo.mlpackage \
      /Users/song-giung/code/side-project/live-point/backend/simul_whisper/models/coreml-encoder-large-v3-turbo.mlpackage
```

---

## Task 6: 서버 시작 및 검증

```bash
cd /Users/song-giung/code/side-project/live-point/backend
uvicorn main:app --port 8000
```

**확인사항:**
1. 로그에 "Loading CoreML encoder" 출력
2. `curl localhost:8000/health` → SimulWhisperService
3. 프론트엔드에서 전사 테스트

---

# Part 3: 문제 발생 시 디버깅 가이드

## 문제: "Falling back to MLX encoder" 출력

**원인 1: CoreML 모델을 못 찾음**
```bash
# 검색 경로 확인
python3 -c "
from simul_whisper.simul_whisper.coreml_encoder import CoreMLWhisperEncoder
paths = CoreMLWhisperEncoder.find_model_path('large-v3-turbo')
print(paths)
"
```

**원인 2: 모델명 불일치**
```bash
# 실제 생성된 파일명 확인
ls backend/simul_whisper/whisper.cpp/models/ | grep coreml
# 파일명이 다르면 심볼릭 링크 다시 생성
```

## 문제: 모델 생성 실패

**원인 1: 메모리 부족**
```bash
# 더 작은 모델로 먼저 테스트
./generate-coreml-model.sh base
```

**원인 2: Xcode 미설치**
```bash
xcode-select --install
```

---

# Part 4: 최종 검증 체크리스트

구현 완료 후 모든 항목 체크:

- [ ] `whisper.cpp` 폴더에 소스코드 있음
- [ ] `coreml-encoder-large-v3-turbo.mlpackage` 존재 (수백 MB)
- [ ] 심볼릭 링크 정상 작동
- [ ] 서버 로그에 "CoreML encoder" 로딩 메시지
- [ ] "Falling back" 메시지 없음
- [ ] Health 체크 정상
- [ ] 프론트엔드 전사 테스트 통과
- [ ] 지연 시간 체감 개선
