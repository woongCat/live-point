# 게임 버튼 분리 + 드래그 가능 + 세션 이름 입력 구현

**구현일: 2026-01-26**

## 개요

게임 시작 버튼을 녹음 버튼과 분리하고, 게임 창을 드래그 가능하게 만들며, 녹음 시작 시 세션 이름 입력 모달을 표시하는 기능을 구현했습니다.

---

## 변경 사항

### 1. 새로 생성된 파일

#### `frontend/src/hooks/useDraggable.ts`
마우스 이벤트 기반 드래그 기능 커스텀 훅
- `position` 상태 관리 (x, y 좌표)
- `.drag-handle` 클래스가 있는 요소에서만 드래그 시작
- 화면 경계 내 이동 제한 (boundaryPadding 옵션)
- `isDragging` 상태로 커서 스타일 변경 가능

#### `frontend/src/components/game/GameStartButton.tsx`
게임 시작 버튼 컴포넌트
- 보라색 배경의 "🎮 게임" 버튼
- `onClick` prop으로 클릭 핸들러 전달

---

### 2. 수정된 파일

#### `frontend/src/components/game/TrashGame.tsx`
**변경 내용:**
- `useDraggable` 훅 적용
- 중앙 전체화면 모달 → 우측 하단 고정 위치로 변경
- 드래그 핸들 헤더 추가 ("쓰레기 던지기" 타이틀 + "드래그하여 이동" 안내)
- consent/ended 모달은 기존대로 중앙 표시
- playing 상태에서만 드래그 가능한 창으로 표시

#### `frontend/src/components/game/index.ts`
**변경 내용:**
- `GameStartButton` export 추가

#### `frontend/src/App.tsx`
**변경 내용:**
- `GameStartButton` import 추가
- 헤더에 게임 버튼 추가 (레이아웃: `[live-point] ... [🎮 게임] [🎤 녹음]`)
- `handleStart`에서 `showConsent()` 제거 (게임과 녹음 분리)
- `handleGameStart` 함수 추가 → `showConsent()` 호출

#### `frontend/src/components/RecordButton.tsx`
**변경 내용:**
- `SessionNameModal` import 추가
- `isModalOpen` 상태 추가
- `currentSession`이 없을 때 녹음 클릭 → 모달 표시
- 모달 제출 시 `startNewSession(name)` 후 녹음 시작
- 모달 취소/ESC 시 녹음 시작 안 함

---

## 동작 방식

### 게임 기능
1. "🎮 게임" 버튼 클릭 → 동의 모달 표시
2. 동의 → 우측 하단에 게임 창 표시
3. 게임 창 상단(drag-handle)을 드래그하여 위치 이동
4. 녹음 없이도 게임 플레이 가능

### 세션 이름 기능
1. 세션 없이 "🎤 녹음" 클릭 → 세션 이름 모달 표시
2. 이름 입력 후 "만들기" → 세션 생성 + 녹음 시작
3. 빈 이름으로 "만들기" → 자동 이름 생성 + 녹음 시작
4. ESC 또는 "취소" → 모달 닫힘, 녹음 안 함
5. 기존 세션 있을 때 녹음 클릭 → 모달 없이 바로 녹음 시작

---

## 기술적 세부사항

### useDraggable 훅 API
```typescript
interface UseDraggableOptions {
  initialPosition?: { x: number; y: number };
  boundaryPadding?: number; // 기본값: 10
}

const {
  position,      // 현재 위치 { x, y }
  setPosition,   // 위치 수동 설정
  isDragging,    // 드래그 중 여부
  elementRef,    // 드래그 대상 요소에 연결할 ref
  handleMouseDown, // onMouseDown에 연결할 핸들러
} = useDraggable(options);
```

### 드래그 핸들 사용법
드래그를 시작할 요소에 `drag-handle` 클래스를 추가:
```tsx
<div className="drag-handle cursor-grab">
  드래그 영역
</div>
```

---

## 검증

```bash
cd frontend && npm run build  # 성공
npx tsc --noEmit              # 타입 에러 없음
```
