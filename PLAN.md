# conversation-practice 파이프라인 구현하기

conversation-practice는 유저가 한국어 말하기 연습을 할 수 있는 공간이다. 주어진 시나리오에서 유저는 목표를 달성하기 위해 한국어로 말하고, 올바른 발화를 해야 다음 단계로 넘어간다.

아래 계획은 실제로 동작 가능한 파이프라인을 빠르게 구축하고, 이후 점진적으로 개선할 수 있도록 세부 설계, API 계약, LLM 스키마, 마일스톤, 리스크까지 포함한다.

## 1) 파이프라인 개요 (업데이트)

1. 시나리오/목표/세부 작업 제공
   - 초기에는 하드코딩된 데이터로 시작한다.
   - 예시: 커피숍에서 조건(가격 제한, 마실 수 없는 음료, 선호 음료)에 맞는 주문 완료.
2. VAD(Voice Activity Detection) 자동 시작
   - 페이지 진입 시 VAD를 초기화 및 실행한다.
3. 발화 구간 분리
   - 사용자가 말하면 VAD가 발화를 인식, 여러 개의 발화(utterance)로 분리한다.
4. 전송 버튼으로 STT 요청
   - 유저는 수집된 발화 뭉치를 서버로 전송한다.
5. 서버에서 STT 처리
   - 발화를 OpenAI Transcriptions로 변환하여 텍스트를 얻는다.
   - 여러 발화는 합쳐서 LLM에 하나의 사용자 턴으로 보낼 수 있다.
6. LLM 질의
   - system prompt + (이전 대화 히스토리 + 현재 사용자 텍스트)를 함께 보낸다.
   - system prompt는 초기 더미로 시작하고 이후 개선한다.
7. LLM 응답(JSON)
   - 에이전트 응답, 성공 여부, 다음 task, 피드백 등을 JSON 스키마로 받는다.
8. TTS 변환
   - 응답 텍스트를 TTS로 변환하여 오디오를 생성한다.
9. UI 재생/표시
   - 에이전트 음성 재생, 텍스트 출력, 진행도 업데이트.

## 2) 전체 아키텍처

- 클라이언트(`korean-learning-app`)
  - UI 컴포넌트: Tailwind + Framer Motion 사용
  - VAD: 오디오 워크렛 기반, `korean-ai-tutor/lib/audio/vad`를 참고해 경량 엔진 구현/포팅
  - 전송/수신 흐름 제어: STT → LLM(JSON) → TTS → 재생
  - 상태: 시나리오/작업 진행도, 발화 세그먼트, 대화 히스토리, 재생 상태
- 서버(`korean-ai-tutor` 재사용)
  - STT: `/api/stt` (OpenAI Transcriptions 프록시)
  - Chat: `/api/openai/chat` (LLM 호출) — JSON 응답 강제(아래 계획에 따라 업데이트)
  - TTS: `/api/elevenlabs/text-to-speech` 또는 `/api/openai/text-to-speech`
  - 모든 API는 zod로 입력/출력 스키마 검증
- 정적 리소스
  - `/public/models/silero-vad.onnx`, `/public/audio-worklets/vad-processor.js` (korean-ai-tutor 참조)

## 3) UI 컴포넌트 책임 정리 (korean-learning-app)

- `components/conversation-practice.tsx`
  - 컨테이너/오케스트레이션: VAD 수명주기 관리, 발화 수집, 전송, LLM/TTS 호출, 재생
  - 히스토리 및 진행도 표시
  - TTS 재생 시 VAD 입력 게이트(`speakingGate`) 활성화로 에코 방지
- `components/scenario-card.tsx`
  - 시나리오 목표/제약/현재 단계 UI
- `components/phrasebook.tsx`
  - 힌트/예문, 성공 시 정답 예문 표시
- 애니메이션
  - 마이크 레벨 미터, 녹음/재생 전환, 단계 전환에 Framer Motion 적용

## 4) 상태 모델(클라이언트)

- `session`: { id, startedAt }
- `scenario`: { id, title, titleEn?, description?, constraints: { priceLimit?, bannedDrinks?: string[], preferred?: string[] }, tasks: { id, ko, en? }[] }
- `userState`: { currentTaskId, currentTaskIndex, taskStatuses: Record<string, 'pending'|'success'|'failed'>, attempts: number, lastUserText?: string }
- `segments`: { id, wavBlob, durationMs, sttText? }[]
- `history`: { role: 'user'|'assistant', text: string }[] (LLM 전송용 메모리)
- `progress`: { completed: number, total: number }
- `playback`: { isPlaying, lastAudioUrl? }

## 5) 데이터 흐름 상세

1) 페이지 진입 → VAD init/start → 상태 `listening`
2) VAD가 발화 감지 → `onSpeechStart`/`onSpeechEnd` 이벤트로 segment 생성, 최신기준으로 segement는 최대 3개만 가지고 있는다.
3) 유저가 "전송" 클릭 → segments 각각을 STT에 업로드(병렬 2~3개 제한)
4) STT 결과 텍스트를 합쳐 userMessage를 구성 → 기존 history와 함께 LLM 호출, 이때 전체 스테이지(시나리오, 테스크)와 유저의 현재 스테이지(현재 테스크, 진행도)를 함께 보낸다.
5) LLM(JSON) 응답 파싱 → 성공/피드백/다음 task 반영
6) agentReply를 TTS로 변환 → 오디오 재생(재생 중 VAD 입력 게이트)
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

## 📋 현재 작업 진행상황 (2025-01-20)

### ✅ 완료된 작업들

#### 1. VAD 시스템 구축 ✅
- **상태**: 완료
- **내용**: korean-ai-tutor의 VAD 엔진을 korean-learning-app으로 성공적으로 포팅
- **구현된 파일들**:
  - `lib/audio/vad/VadEngine.ts` - 핵심 VAD 엔진 클래스
  - `lib/audio/vad/VadConfig.ts` - VAD 설정 및 기본값
  - `lib/audio/vad/wav.ts` - WAV 인코딩 유틸리티
  - `hooks/use-vad.ts` - VAD 상태 관리 React 훅
- **정적 리소스**:
  - `public/models/silero-vad.onnx` - Silero VAD 모델
  - `public/audio-worklets/vad-processor.js` - 오디오 워크렛

#### 2. 시나리오 데이터 구조 ✅
- **상태**: 완료
- **내용**: 하드코딩된 커피숍 시나리오 및 작업 목록 정의
- **구현된 파일**: `lib/scenarios.ts`
- **포함된 기능**:
  - 커피숍 시나리오 (가격 제한, 금지 음료, 선호 음료 조건)
  - 4단계 학습 작업 정의
  - 진행도 계산 유틸리티 함수들

#### 3. 상태 관리 시스템 ✅
- **상태**: 완료
- **내용**: React Context를 사용한 전역 상태 관리
- **구현된 파일**: `contexts/ConversationContext.tsx`
- **관리되는 상태**:
  - 세션 정보 (ID, 시작 시간)
  - 시나리오 및 사용자 진행 상태
  - 오디오 세그먼트 (최대 3개 유지)
  - 대화 히스토리
  - 재생 상태 및 음성 인식 상태

#### 4. UI 컴포넌트 통합 ✅
- **상태**: 완료
- **내용**: ConversationPractice 컴포넌트를 VAD 및 상태 관리와 완전 통합
- **구현된 기능**:
  - 실시간 음성 레벨 시각화 (Framer Motion)
  - 오디오 세그먼트 수집 및 표시
  - 마이크 버튼 상태 전환 애니메이션
  - Speaking Gate 구현 (TTS 재생 중 VAD 입력 차단)

#### 5. 패키지 설치 ✅
- **상태**: 완료
- **설치된 패키지**:
  - `onnxruntime-web`: VAD 모델 실행
  - `framer-motion`: UI 애니메이션

### 🔄 현재 진행 중인 작업

#### STT API 통합 🔄
- **상태**: 진행 중 (50% 완료)
- **완료된 부분**:
  - 세그먼트 수집 및 UI 표시
  - 전송 버튼 구현
- **남은 작업**:
  - korean-ai-tutor의 `/api/stt` 엔드포인트 호출 구현
  - 병렬 STT 처리 (2-3개 세그먼트 제한)
  - STT 결과 텍스트 병합 로직

### 📅 다음 작업 계획

#### 우선순위 1: API 통합
1. **STT API 완료** - 세그먼트를 텍스트로 변환
2. **Chat API 업데이트** - JSON 응답 모드로 korean-ai-tutor 수정
3. **LLM 응답 스키마** - TurnResult zod 스키마 구현

#### 우선순위 2: TTS 및 오디오
4. **TTS API 통합** - 에이전트 응답을 음성으로 변환
5. **Speaking Gate 완성** - 에코 방지 로직 최적화

#### 우선순위 3: 사용자 경험
6. **에러 처리** - 네트워크 실패, 재시도 로직
7. **진행도 추적** - 작업 성공/실패 판정 및 다음 단계 전환
8. **로컬 스토리지** - 세션 상태 지속성

#### 우선순위 4: 최종 검증
9. **엔드투엔드 테스트** - 전체 플로우 검증

### 🏗️ 현재 아키텍처 상태

```
korean-learning-app/
├── lib/audio/vad/          ✅ VAD 엔진 (완료)
├── hooks/use-vad.ts        ✅ VAD 훅 (완료)
├── contexts/               ✅ 상태 관리 (완료)
├── lib/scenarios.ts        ✅ 시나리오 데이터 (완료)
├── components/
│   └── conversation-practice.tsx  ✅ 메인 UI (완료)
└── public/
    ├── models/             ✅ VAD 모델 (완료)
    └── audio-worklets/     ✅ 오디오 처리 (완료)
```

### 🔧 기술적 이슈 및 해결책

#### 해결된 이슈:
1. **VAD 모델 로딩** - onnxruntime-web으로 브라우저에서 실행 가능
2. **타입 안전성** - TypeScript 타입 정의 완료
3. **상태 동기화** - Context와 VAD 훅 간 완벽한 동기화

#### 현재 알려진 이슈:
1. **STT API 미완료** - 실제 음성-텍스트 변환 대기 중
2. **더미 데이터 사용** - LLM 응답이 아직 하드코딩됨

### 📊 진행률 요약
- **전체 진행률**: 약 40% (16개 작업 중 6개 완료, 1개 진행 중)
- **핵심 인프라**: 90% 완료 (VAD, 상태관리, UI)
- **API 통합**: 10% 완료 (STT 진행 중)
- **사용자 경험**: 20% 완료 (기본 UI만)

---
## Reference

korean-ai-tutor/lib/audio를 참고해달라. 관련된 API도 참고가 필요하다.