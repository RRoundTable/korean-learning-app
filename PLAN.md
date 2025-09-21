# conversation-practice 파이프라인 구현하기

conversation-practice는 유저가 한국어 말하기 연습을 할 수 있는 공간이다. 주어진 시나리오에서 유저는 목표를 달성하기 위해 한국어로 말하고, 올바른 발화를 해야 다음 단계로 넘어간다.

아래 계획은 실제로 동작 가능한 파이프라인을 빠르게 구축하고, 이후 점진적으로 개선할 수 있도록 세부 설계, API 계약, LLM 스키마, 마일스톤, 리스크까지 포함한다.

## 1) 파이프라인 개요 (업데이트 - 간소화된 접근)

1. 시나리오/목표/세부 작업 제공
   - 초기에는 하드코딩된 데이터로 시작한다.
   - 예시: 커피숍에서 조건(가격 제한, 마실 수 없는 음료, 선호 음료)에 맞는 주문 완료.
2. 간단한 녹음 기능
   - 사용자가 마이크 버튼을 누르면 녹음 시작
   - 다시 버튼을 누르면 녹음 종료
   - MediaRecorder API 사용하여 오디오 캡처
3. STT 처리
   - 녹음이 완료되면 자동으로 STT 요청 시작
   - 서버에서 OpenAI Transcriptions로 변환하여 텍스트를 얻는다.
4. LLM 질의
   - system prompt + (이전 대화 히스토리 + 현재 사용자 텍스트)를 함께 보낸다.
   - system prompt는 초기 더미로 시작하고 이후 개선한다.
5. LLM 응답(JSON)
   - 에이전트 응답, 성공 여부, 다음 task, 피드백 등을 JSON 스키마로 받는다.
6. TTS 변환
   - 응답 텍스트를 TTS로 변환하여 오디오를 생성한다.
7. UI 재생/표시
   - 에이전트 음성 재생, 텍스트 출력, 진행도 업데이트.

### 향후 개선 계획 (VAD 통합)
- STT 전에 VAD로 발화 구간만 필터링하여 정확도 향상
- 무음 구간 제거로 STT 비용 절약 및 속도 개선

## 2) 전체 아키텍처

- 클라이언트(`korean-learning-app`)
  - UI 컴포넌트: Tailwind + Framer Motion 사용
  - 녹음: MediaRecorder API 기반 간단한 녹음 기능
  - 전송/수신 흐름 제어: 녹음 → STT → LLM(JSON) → TTS → 재생
  - 상태: 시나리오/작업 진행도, 녹음 상태, 대화 히스토리, 재생 상태
- 서버(`korean-ai-tutor` 재사용)
  - STT: `/api/stt` (OpenAI Transcriptions 프록시)
  - Chat: `/api/openai/chat` (LLM 호출) — JSON 응답 강제(아래 계획에 따라 업데이트)
  - TTS: `/api/elevenlabs/text-to-speech` 또는 `/api/openai/text-to-speech`
  - 모든 API는 zod로 입력/출력 스키마 검증
- 정적 리소스
  - 향후 VAD 통합 시: `/public/models/silero-vad.onnx`, `/public/audio-worklets/vad-processor.js`

## 3) UI 컴포넌트 책임 정리 (korean-learning-app)

- `components/conversation-practice.tsx`
  - 컨테이너/오케스트레이션: 녹음 상태 관리, STT/LLM/TTS 호출, 재생
  - 히스토리 및 진행도 표시: Tasks ({currentTaskIndex}/{scenario.tasks?.length || 3} completed) 를 이용한다.
  - 간단한 녹음 UI: 마이크 버튼 클릭으로 녹음 시작/종료
- `components/scenario-card.tsx`
  - 시나리오 목표/제약/현재 단계 UI
- `components/phrasebook.tsx`
  - 힌트/예문, 성공 시 정답 예문 표시
- 애니메이션
  - 녹음 상태 표시, 녹음/재생 전환, 단계 전환에 Framer Motion 적용

## 4) 상태 모델(클라이언트)

- `session`: { id, startedAt }
- `scenario`: { id, title, titleEn?, description?, constraints: { priceLimit?, bannedDrinks?: string[], preferred?: string[] }, tasks: { id, ko, en? }[] }
- `userState`: { currentTaskId, currentTaskIndex, taskStatuses: Record<string, 'pending'|'success'|'failed'>, attempts: number, lastUserText?: string }
- `recording`: { isRecording: boolean, audioBlob?: Blob, duration?: number }
- `history`: { role: 'user'|'assistant', text: string }[] (LLM 전송용 메모리)
- `progress`: { completed: number, total: number }
- `playback`: { isPlaying, lastAudioUrl? }

## 5) 데이터 흐름 상세

1) 페이지 진입 → 초기 상태 `idle`
2) 유저가 마이크 버튼 클릭 → 녹음 시작 (`isRecording: true`)
3) 유저가 마이크 버튼 다시 클릭 → 녹음 종료, 자동으로 STT 처리 시작
4) STT 결과 텍스트를 userMessage로 구성 → 기존 history와 함께 LLM 호출, 이때 전체 스테이지(시나리오, 테스크)와 유저의 현재 스테이지(현재 테스크, 진행도)를 함께 보낸다.
5) LLM(JSON) 응답 파싱 → 성공/피드백/다음 task 반영
6) agentReply를 TTS로 변환 → 오디오 재생
7) UI에 텍스트/오디오/진행도 반영, 다음 턴 대기

## 6) API 계약 (서버는 `korean-ai-tutor` 사용)

### STT
- `POST /api/stt`
- 요청: multipart/form-data
  - `file`: audio/wav (단일 세그먼트)
  - `language?`: `ko`
  - `prompt?`: string
  - `durationMs?`: number
- 응답(JSON)
```json
{ "text": "...", "language": "ko", "durationMs": 1234 }
```

### Chat (구현 변경 필요: JSON 응답 강제)
- `POST /api/openai/chat`
- 요청(JSON)
```json
{
  "sessionId": "temp-session",
  "userMessage": "유저 발화 통합 텍스트",
  "systemPrompt": "(더미 프롬프트)",
  "scenarioContext": {
    "scenarioId": 1,
    "title": "아늑한 동네 카페에서",
    "constraints": { "priceLimit": 5000, "bannedDrinks": ["energy drink"], "preferred": ["latte"] },
    "tasks": [
      { "id": "t-0", "ko": "가격을 확인하세요" },
      { "id": "t-1", "ko": "금지 음료를 피하세요" },
      { "id": "t-2", "ko": "선호 음료로 주문하세요" }
    ]
  },
  "progress": { "currentTaskIndex": 1, "completed": 1, "total": 3 },
  "currentTask": { "id": "t-1", "ko": "금지 음료를 피하세요" },
  "memoryHistory": [
    { "role": "user", "text": "..." },
    { "role": "assistant", "text": "..." }
  ]
}
```
- 응답(JSON) — 아래 TurnResult 스키마. 기존 문자열 응답에서 전환하기 위해 서버 라우트에 `response_format` 적용 및 zod 파싱 추가.
  - 서버 zod 입력 스키마도 `scenarioContext`, `progress`, `currentTask` 필드를 수용하도록 확장.

### TTS
- `POST /api/elevenlabs/text-to-speech` (권장) 또는 `POST /api/openai/text-to-speech`
- 요청(JSON, 예)
```json
{ "text": "에이전트 응답", "voiceId": "default", "model": "eleven_turbo_v2_5" }
```
- 응답: 오디오 바이너리(Stream). 클라이언트에서 `Blob`으로 재생.

## 7) LLM 시스템 프롬프트(초안)

"너는 한국어 회화 튜터다. 사용자가 제시된 시나리오 목표를 달성하도록 단계적으로 안내하라. 간결하고 자연스러운 한국어로 답하되, 학습 피드백(틀린 표현, 더 좋은 표현)을 제공하라. 반드시 JSON 스키마에 맞게만 답하라. 한국어로 답변하되, 필요 시 짧은 영어 설명을 괄호로 덧붙일 수 있다."

## 8) LLM 응답 JSON 스키마(안)

zod(서버) 기준 제안 스키마:

```ts
// TurnResult
{
  agentReply: string;          // 에이전트 발화(한국어)
  success: boolean;            // 현재 task 성공 여부
  nextTaskId?: string | null;  // 다음 task 식별자(없을 수 있음)
  feedback?: string;           // 교정/칭찬/힌트 요약
  score?: number;              // 0~100, 선택
  hints?: string[];            // 추가 힌트
}
```

예시 응답:
```json
{
  "agentReply": "좋아요. 아이스 라떼를 원하시는군요. 가격은 5천 원 이하 맞죠?",
  "success": false,
  "nextTaskId": "confirm_price",
  "feedback": "가격 조건을 명확히 말해보세요.",
  "score": 62,
  "hints": ["가격 상한을 먼저 말하기", "금지 음료 언급 피하기"]
}
```

서버(`korean-ai-tutor/app/api/openai/chat/route.ts`) 수정 포인트
- `response_format`을 JSON 엄격 모드로 설정(모델 호환 시 `json_object` 또는 `json_schema`).
- 모델 응답을 zod `TurnResultSchema`로 파싱 후 반환.
- 실패 시 명확한 4xx/5xx 에러 메시지.
 - 입력 스키마에 `scenarioContext`, `progress`, `currentTask`를 추가하고 서버 로깅에 포함.

## 9) VAD 파이프라인 세부 규칙

- 모델: `silero-vad.onnx` (onnxruntime-web)
- `VadEngine` 기본값 참고: `frameMs=30`, `speechProbabilityThreshold≈0.5`, `startSpeechAfterMs≈90`, `endSilenceAfterMs≈500`, `maxUtteranceMs≈12000`
- 오디오 워크렛에서 프레임 수집 → 확률 스무딩 → 발화 시작/종료 판정
- `onSpeechEnd`에서 WAV Blob 생성, 세그먼트로 저장
- TTS 재생 중에는 `speakingGate=true`로 입력 게이트하여 에코/트리거 방지

## 9.1) 상태 전이(State Machine)

- listening → capturing(사용자 발화 중) → sending(STT 업로드) → thinking(LLM 응답 대기)
- speaking(TTS 재생, speakingGate on) → evaluating(성공 판정/진행도 갱신) → nextTask 또는 complete

전이 규칙
- speaking 시작 시: `playback.isPlaying=true`, `speakingGate=true`
- speaking 종료 시: `playback.isPlaying=false`, `speakingGate=false`, LLM 결과에 따라 `taskStatuses[currentTaskId]` 업데이트 및 `currentTaskIndex` 증감

## 10) 에러 처리

- STT 실패: 해당 세그먼트만 재시도(최대 2회), 불가 시 사용자 알림 및 건너뛰기
- Chat 실패: 메시지/프롬프트 길이 축소 후 1회 재시도
- TTS 실패: 텍스트만 표시하고 다음 턴 진행 가능
- 네트워크 타임아웃: 20~30초 설정, 취소 가능 UI 제공

## 11) 성능/비용

- 세그먼트 병렬 STT는 2~3개로 제한(브라우저/제공자 한도 고려)
- 히스토리는 최근 n턴만 전송(토큰 비용 절감)
- 오디오 재생은 Blob URL 캐시, 필요 시 LRU 제거

## 12) 보안/환경변수

- 서버(`korean-ai-tutor`)에서만 OpenAI/ElevenLabs 키 사용
- 필요한 ENV (서버): `OPENAI_API_KEY`, `JWT_SECRET`, `ELEVENLABS_API_KEY` 등
- DB 스키마 변경 시:
  - `pnpm run db:generate:dev`
  - `pnpm run db:migrate:dev`

## 13) 개발 마일스톤 & 수용 기준(DoD)

- M1: VAD 통합 및 UI
  - VAD 시작/정지, 레벨 미터, 세그먼트 생성
  - DoD: 10초 이내 발화 → 최소 1개 세그먼트 생성 및 UI 목록 표시
- M2: STT 연동
  - `/api/stt`로 세그먼트 업로드 → 텍스트 변환/병합
  - DoD: 2개 이상 세그먼트 병합 텍스트가 화면에 표시
- M3: Chat(JSON) 응답
  - Chat 라우트 JSON 강제, zod 파싱, `TurnResult` 수신
  - DoD: success/feedback/nextTask UI 반영
- M4: TTS 재생/게이팅
  - agentReply를 오디오로 재생, 재생 중 VAD 입력 차단
  - DoD: 에코로 인한 허위 트리거 없이 정상 턴 전환
- M5: 시나리오 진행/완료
  - 작업 성공 누적, 완료 시 축하 메시지/요약 피드백
  - DoD: 커피숍 시나리오 엔드투엔드 시연 가능

- M6: 상태 관리/동기화
  - 시나리오/테스크/유저 상태를 컨텍스트에서 관리하고, LLM 입력에 `scenarioContext`/`progress` 포함
  - DoD: 새로고침 후에도 컨텍스트가 복원되고(로컬 저장소 or 서버 세션), 현재 테스크가 정확히 표시됨

## 14) 리스크 & 대응

- 모델 JSON 엄격 모드 미지원 → 프롬프트 가드/출력 검증 강화
- 브라우저 오디오 권한/장치 이슈 → 권한 가이드 및 오류 UI
- TTS 대기시간 → 캐싱/짧은 응답 우선 전략

## 15) 장기 계획(백로그)

- 시나리오 에디터(노코드) → 파일/DB 기반 관리
- 사용자 레벨/메달/점수화, 진행 리포트
- 발화 평가(발음·유창성 점수) 확장
- 다국어 UI/자막, 오프라인 모드(부분)

## 16) 시나리오/테스크/유저 상태 관리 설계(상세)

컨텍스트 기반의 상태 관리(예시 인터페이스):
```ts
type LearningTask = { id: string; ko: string; en?: string; status: 'pending'|'success'|'failed' }
type Progress = { completed: number; total: number }
type UserState = { currentTaskId: string; currentTaskIndex: number; taskStatuses: Record<string, LearningTask['status']>; attempts: number }

// 핵심 업데이트 액션
- markCurrentTaskSuccess(): 현재 테스크를 success로 변경, progress 갱신
- markCurrentTaskFailed(): 현재 테스크를 failed로 변경(재도전 허용)
- gotoNextTask(): 다음 테스크로 이동(마지막이면 완료 상태)
- setListening(on): UI/녹음 상태 토글
- setAgentSpeaking(on): TTS 재생 시 게이트 토글

동기화/복원
- 클라이언트: localStorage에 `sessionId`, `scenarioId`, `currentTaskIndex`, `taskStatuses` 저장
- 서버: `conversation-history`/`sessions`와 매핑, 필요 시 테스크 메타(선택)
```

---
# 작업로그

## 2024-12-19: 파이프라인 계획 수정 및 간단한 녹음 기능 구현

### 계획 변경사항
- VAD 자동 시작 방식에서 사용자 제어 방식으로 변경
- 마이크 버튼 클릭으로 녹음 시작/종료하는 간단한 방식 채택
- VAD는 향후 STT 전 필터링 용도로 후순위 배치

### 구현 완료
1. **간단한 녹음 기능 (파이프라인 1-3단계)**
   - MediaRecorder API를 사용한 오디오 캡처
   - 마이크 버튼 클릭으로 녹음 시작/종료
   - 녹음 중 시각적 피드백 (빨간색 애니메이션, 타이머)
   - 녹음 완료 후 자동 STT 처리 준비 (현재는 시뮬레이션)

2. **UI 개선**
   - 녹음 상태별 버튼 색상 변경 (일반/녹음중/처리중)
   - 녹음 시간 표시
   - 상태별 안내 메시지
   - 처리 중 스피너 애니메이션

3. **상태 관리**
   - `isRecording`: 녹음 중 여부
   - `isProcessing`: STT 처리 중 여부  
   - `recordingDuration`: 녹음 시간 추적

### 다음 단계
- STT API 연동 (`korean-ai-tutor` 서버 활용)
- LLM JSON 응답 처리
- TTS 통합
- 향후: VAD 필터링 추가

---
## Reference

korean-ai-tutor/lib/audio를 참고해달라. 관련된 API도 참고가 필요하다.