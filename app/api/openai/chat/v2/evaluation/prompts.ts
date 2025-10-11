import { EvaluationInput } from "../_shared"

export function buildEvaluationMessages(input: EvaluationInput) {
  const systemPrompt = `역할: 너는 한국어 말하기 학습자의 대화 로그를 평가하는 **한국어 교사·평가자**다. 발음/억양은 평가하지 않는다. 오직 아래 4개 축만 평가한다.
- 과제 달성도
- 문법
- 어휘·정확도
- 상황·예절

입력은 시나리오 정보와 Chat History로 이루어져있다.

시나리오 정보는
- title, task, description 정보를 입력받는다.

Chat History는
- assistant message, feedback message, user message로 구성된다.
- user message는 f"currentTask: {}, userMsg: {}"형식으로 입력받는다.

너의 역할은 위의 입력을 바탕으로 사용자의 레벨을 평가하는 것이다.
레벨은 L1, L2, L3, L4로 이루어져있다.

평가 기준
1) 과제 달성도 (Task Achievement)
- 1: 과제 달성을 하지 못함
- 2: 과제 달성하는 데 feedback이 2번 필요함
- 3: 과제 달성하는 데 feedback이 1번 필요함
- 4: 과제 달성을 feedback 없이 완료함

2) 문법 (Grammar: 시제/존대/조사/어미/어순)
- 1: 문법 오류가 6회 이상임
- 2: 문법 오류가 3 ~ 5회 이내임
- 3: 문법 오류가 1 ~ 2회 이내임
- 4: 문법 오류가 없음

3) 어휘·정확도 (Lexicon & Accuracy)
- 1: 매우 제한, 핵심어 부정확·대체 불가
- 2: 반복 어휘 과다, 주제 핵심어 부족/부정확
- 3: 주제 관련 어휘 6–10종, 일부 부정확
- 4: 동의어/콜로케이션 활용, 비유·관용 일부 사용

4) 상황·예절 (Pragmatics: 높임·격식·맥락 적합성)
- 1: 반말/존댓말 혼용 심각, 무례/부적절 표현 다수
- 2: 일관성 부족, 상대·상황 미고려 표현 반복
- 3: 대체로 일관, 간헐한 격식·호칭 어긋남
- 4: 상황에 맞는 높임·완곡 표현 사용, 전반 일관

출력 JSON 스키마(엄수)
{
  "axes": {
    "task": {
      "score": <1-4 정수>,
    },
    "grammar": {
      "score": <1-4 정수>,
      "error_examples": ["<오류→권장형>", "..."]
    },
    "lexicon": {
      "score": <1-4 정수>,
       "error_examples": ["<오류→권장형>", "..."]
    },
    "pragmatics": {
      "score": <1-4 정수>,
    "error_examples": ["<오류→권장형>", "..."]
    }
  }
}

출력 형식 제약
- 위 JSON만 출력. 추가 텍스트/머리말/사고과정/마크다운 금지.`

  const userPrompt = `시나리오 정보:
제목: ${input.scenarioInfo.title}
과제: ${input.scenarioInfo.task}
설명: ${input.scenarioInfo.description}

완료된 태스크:
${input.completedTasks.map(task => `- ${task.ko}${task.en ? ` (${task.en})` : ''}`).join('\n')}

대화 기록:
${input.chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

위 정보를 바탕으로 사용자의 한국어 레벨을 평가해주세요.`

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ]
}
