import { ScenarioPromptInput, MessageHistory } from "./types"

const ASSISTANT_SYSTEM_PROMPT =
`너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.

**중요한 역할극 규칙:**
1. 사용자는 정해진 테스크 순서대로 수행해야 한다
2. 너는 전체 테스크 목록과 현재 진행 상황을 알고 있다
3. 대화 히스토리를 바탕으로 자연스러운 대화를 이어간다
4. 테스크 순서에 맞지 않는 요청이면 적절히 안내한다
5. 각 테스크는 자연스러운 대화 흐름으로 진행되어야 한다

**역할극 진행 방식:**
- 전체 테스크 맥락과 대화 히스토리를 고려하여 응답한다
- 사용자가 현재 테스크를 수행하면, 해당 테스크에 맞는 응답을 한다
- 테스크가 완료되면 자연스럽게 다음 테스크로 이어지는 대화를 한다
- 이전 대화 내용을 참고하여 일관성 있는 역할극을 진행한다
- 절대 선생님처럼 말하지 말고, 시나리오에 몰입해서 역할극을 진행한다

역할극에 몰입해라. 절대 선생님처럼 말하지마. 시나리오에 몰입해. 한문장만 말해. 한국어로만 대답해야해.
`

export function buildAssistantSystemPrompt(): string {
  return ASSISTANT_SYSTEM_PROMPT
}

export function buildScenarioSystemMessage(input?: ScenarioPromptInput): string | undefined {
  if (!input) return undefined
  const lines: string[] = []
  lines.push(`시나리오 제목: ${input.title}`)
  if (input.assistantRole) lines.push(`나의 역할: ${input.assistantRole}`)
  if (input.userRole) lines.push(`사용자 역할: ${input.userRole}`)
  if (input.description) lines.push(`시나리오 설명: ${input.description}`)
  
  // 테스크 목록 추가
  if (input.tasks && input.tasks.length > 0) {
    lines.push(`\n전체 테스크 목록:`)
    input.tasks.forEach((task, index) => {
      lines.push(`${index + 1}. ${task.ko}`)
    })
  }
  
  return "\n" + lines.join("\n") + "\n"
}

export function buildTaskContextMessage(
  scenario?: ScenarioPromptInput,
  currentTask?: { id: string; ko: string; en?: string }, 
  progress?: { currentTaskIndex: number; completed: number; total: number }
): string | undefined {
  if (!scenario || !currentTask) return undefined
  
  const lines: string[] = []
  lines.push(`현재 테스크: ${currentTask.ko}`)
  
  if (progress) {
    lines.push(`진행 상황: ${progress.completed}/${progress.total} 완료`)
    lines.push(`현재 테스크 인덱스: ${progress.currentTaskIndex + 1}`)
    
    // 진행률 계산
    const progressPercentage = Math.round((progress.completed / progress.total) * 100)
    lines.push(`완료율: ${progressPercentage}%`)
  }
  
  // 전체 테스크 맥락 제공
  if (scenario.tasks && scenario.tasks.length > 0) {
    lines.push(`\n전체 테스크 흐름:`)
    scenario.tasks.forEach((task, index) => {
      const status = index < progress?.currentTaskIndex ? "✅ 완료" : 
                   index === progress?.currentTaskIndex ? "🔄 진행중" : "⏳ 대기중"
      lines.push(`${index + 1}. ${task.ko} ${status}`)
    })
  }
  
  // 다음 테스크 정보 제공
  if (progress && progress.currentTaskIndex < scenario.tasks.length - 1) {
    const nextTask = scenario.tasks[progress.currentTaskIndex + 1]
    lines.push(`\n다음 테스크: ${nextTask.ko}`)
  }
  
  lines.push(`\n이전 대화 내용과 전체 테스크 맥락을 참고하여 자연스러운 대화를 이어가세요.`)
  
  return lines.join("\n")
}

export function buildConversationContextMessage(
  history?: MessageHistory,
  currentTask?: { id: string; ko: string; en?: string }
): string | undefined {
  if (!history || history.length === 0) return undefined
  
  const lines: string[] = []
  lines.push(`대화 히스토리 분석:`)
  
  // 최근 대화 내용 요약 (더 많은 컨텍스트 제공)
  const recentMessages = history.slice(-6) // 최근 6개 메시지로 확장
  recentMessages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '사용자' : '어시스턴트'
    const messageNumber = history.length - recentMessages.length + index + 1
    lines.push(`${messageNumber}. ${role}: ${msg.text}`)
  })
  
  // 대화 흐름 분석
  const userMessages = history.filter(msg => msg.role === 'user')
  const assistantMessages = history.filter(msg => msg.role === 'assistant')
  
  lines.push(`\n대화 진행 상황:`)
  lines.push(`- 총 대화 횟수: ${history.length}회`)
  lines.push(`- 사용자 메시지: ${userMessages.length}개`)
  lines.push(`- 어시스턴트 응답: ${assistantMessages.length}개`)
  
  lines.push(`\n현재 테스크 "${currentTask?.ko}"에 대한 사용자의 응답을 받았습니다.`)
  lines.push(`이전 대화 내용과 전체 테스크 맥락을 참고하여 자연스러운 대화를 이어가세요.`)
  
  return lines.join("\n")
}

export function buildTaskTransitionMessage(
  scenario?: ScenarioPromptInput,
  currentTask?: { id: string; ko: string; en?: string },
  progress?: { currentTaskIndex: number; completed: number; total: number }
): string | undefined {
  if (!scenario || !currentTask || !progress) return undefined
  
  // 현재 테스크가 마지막 테스크인지 확인
  const isLastTask = progress.currentTaskIndex >= scenario.tasks.length - 1
  
  if (isLastTask) {
    return `🎉 모든 테스크가 완료되었습니다! 시나리오를 성공적으로 마쳤습니다.`
  }
  
  // 다음 테스크 정보
  const nextTask = scenario.tasks[progress.currentTaskIndex + 1]
  if (!nextTask) return undefined
  
  const lines: string[] = []
  lines.push(`✅ 현재 테스크 "${currentTask.ko}"가 완료되었습니다.`)
  lines.push(`🔄 다음 테스크 "${nextTask.ko}"로 자연스럽게 진행하세요.`)
  lines.push(`📊 진행률: ${progress.completed + 1}/${progress.total} (${Math.round(((progress.completed + 1) / progress.total) * 100)}%)`)
  
  return lines.join("\n")
}

export function buildAssistantMessages(options: {
  scenario?: ScenarioPromptInput
  currentTask?: { id: string; ko: string; en?: string }
  progress?: { currentTaskIndex: number; completed: number; total: number }
  history?: MessageHistory
  userMessage: string
}) {
  const { scenario, currentTask, progress, history, userMessage } = options
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

  const system = buildAssistantSystemPrompt()
  if (system) messages.push({ role: "system", content: system })

  const scenarioMsg = buildScenarioSystemMessage(scenario)
  if (scenarioMsg && scenarioMsg.trim().length > 0) {
    messages.push({ role: "system", content: scenarioMsg })
  }

  // 테스크 맥락과 진행 상황 추가
  const taskContextMsg = buildTaskContextMessage(scenario, currentTask, progress)
  if (taskContextMsg && taskContextMsg.trim().length > 0) {
    messages.push({ role: "system", content: taskContextMsg })
  }

  // 대화 히스토리 컨텍스트 추가
  const conversationContextMsg = buildConversationContextMessage(history, currentTask)
  if (conversationContextMsg && conversationContextMsg.trim().length > 0) {
    messages.push({ role: "system", content: conversationContextMsg })
  }

  // 테스크 전환 메시지 추가 (테스크 완료 시)
  const transitionMsg = buildTaskTransitionMessage(scenario, currentTask, progress)
  if (transitionMsg && transitionMsg.trim().length > 0) {
    messages.push({ role: "system", content: transitionMsg })
  }

  if (history && history.length > 0) {
    history.forEach((m) => messages.push({ role: m.role, content: m.text }))
  }

  const last = messages[messages.length - 1]
  const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userMessage).trim())
  if (shouldAppend) messages.push({ role: "user", content: userMessage })

  return messages
}


