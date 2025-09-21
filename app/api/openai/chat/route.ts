import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

// Input schema for conversation practice
export const ChatInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  userMessage: z.string().min(1, "userMessage is required"),
  systemPrompt: z.string().optional(),
  scenarioContext: z.object({
    scenarioId: z.union([z.string(), z.number()]),
    title: z.string(),
    constraints: z.record(z.any()).optional(),
    tasks: z.array(z.object({
      id: z.string(),
      ko: z.string(),
      en: z.string().optional(),
    })),
  }).optional(),
  progress: z.object({
    currentTaskIndex: z.number(),
    completed: z.number(),
    total: z.number(),
  }).optional(),
  currentTask: z.object({
    id: z.string(),
    ko: z.string(),
    en: z.string().optional(),
  }).optional(),
  memoryHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1),
      })
    )
    .optional(),
})
export type ChatInput = z.infer<typeof ChatInputSchema>

// TurnResult schema for conversation practice
export const TurnResultSchema = z.object({
  agentReply: z.string(),
  success: z.boolean(),
  nextTaskId: z.string().nullable().optional(),
  feedback: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  hints: z.array(z.string()).optional(),
})
export type TurnResult = z.infer<typeof TurnResultSchema>

// Response schema
export const ChatResponseSchema = z.object({
  text: z.string(),
  createdAt: z.coerce.date(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
  turnResult: TurnResultSchema.optional(),
})
export type ChatResponse = z.infer<typeof ChatResponseSchema>

// Direct chat implementation using OpenAI
export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = ChatInputSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.flatten().formErrors.join("; ") || "Invalid input"
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const { sessionId, userMessage, systemPrompt, scenarioContext, progress, currentTask, memoryHistory } = parsed.data

    // Build messages from recent history
    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []
    
    // Enhanced system prompt for conversation practice
    let finalSystemPrompt = systemPrompt
    if (scenarioContext && currentTask) {
      finalSystemPrompt = `너는 한국어 회화 튜터다. 사용자가 제시된 시나리오 목표를 달성하도록 단계적으로 안내하라.

시나리오: ${scenarioContext.title}
현재 과제: ${currentTask.ko}
진행도: ${progress?.completed || 0}/${progress?.total || 3}

간결하고 자연스러운 한국어로 답하되, 학습 피드백(틀린 표현, 더 좋은 표현)을 제공하라. 
반드시 JSON 스키마에 맞게만 답하라. 한국어로 답변하되, 필요 시 짧은 영어 설명을 괄호로 덧붙일 수 있다.

JSON 응답 형식:
{
  "agentReply": "에이전트 발화(한국어)",
  "success": boolean, // 현재 task 성공 여부
  "nextTaskId": "다음 task 식별자 또는 null",
  "feedback": "교정/칭찬/힌트 요약",
  "score": 0-100 점수,
  "hints": ["추가 힌트 배열"]
}`
    }
    
    if (finalSystemPrompt && finalSystemPrompt.trim().length > 0) {
      messages.push({ role: "system", content: finalSystemPrompt })
    }

    // Use client memory only
    if (memoryHistory && Array.isArray(memoryHistory) && memoryHistory.length > 0) {
      memoryHistory.forEach((m) => {
        messages.push({ role: m.role, content: m.text })
      })
    }

    // Avoid duplicating the most recent user turn
    const last = messages[messages.length - 1]
    const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userMessage).trim())
    if (shouldAppend) {
      messages.push({ role: "user", content: userMessage })
    }

    // Call OpenAI Chat Completions API
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini"
    const requestBody: any = {
      model,
      messages,
      temperature: 0.7,
    }

    // Use JSON mode for conversation practice
    if (scenarioContext && currentTask) {
      requestBody.response_format = { type: "json_object" }
    }

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResp.ok) {
      const errText = await openaiResp.text().catch(() => "")
      return NextResponse.json({ error: `LLM provider error: ${openaiResp.status} ${errText}` }, { status: 502 })
    }

    const data = (await openaiResp.json()) as any
    const assistantText: string = data?.choices?.[0]?.message?.content ?? ""
    const usage = data?.usage
      ? {
          promptTokens: Number(data.usage.prompt_tokens || 0),
          completionTokens: Number(data.usage.completion_tokens || 0),
          totalTokens: Number(data.usage.total_tokens || 0),
        }
      : undefined

    // Parse JSON response for conversation practice
    let turnResult: TurnResult | undefined
    if (scenarioContext && currentTask && assistantText) {
      try {
        const jsonResponse = JSON.parse(assistantText)
        const parsedTurnResult = TurnResultSchema.safeParse(jsonResponse)
        if (parsedTurnResult.success) {
          turnResult = parsedTurnResult.data
        } else {
          console.warn("Failed to parse TurnResult:", parsedTurnResult.error)
        }
      } catch (error) {
        console.warn("Failed to parse JSON response:", error)
      }
    }

    const responsePayload = ChatResponseSchema.parse({
      text: turnResult ? turnResult.agentReply : String(assistantText),
      createdAt: new Date(),
      usage,
      turnResult,
    })

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error("Chat failed:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
