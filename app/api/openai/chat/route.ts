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
    role: z.string().optional(),
    userRole: z.string().optional(),
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
    let BasicSystemPrompt = systemPrompt
    let scenarioSystemMessage: string | undefined
    if (scenarioContext && currentTask) {
      BasicSystemPrompt = `너는 지금 한국어로 역할극을 하고 있다.
너의 역할은 사용자와 함께 역할극을 진행하는 것이다.
사용자는 한국어를 공부하는 외국인이다. 외국인이 한국어를 사용하여 너와 함께 역할극을 진행할 것이다.
역할극의 목표는 사용자가 한국어를 사용해서 원하는 목적을 달성하는 것이다.

사용자는 정해진 목표가 있지만, 부족한 정보가 있고, 너는 사용자가 상대방 역할을 하며 사용자가 올바른 한국어로 말했을때 부족한 정보에 대한 힌트를 제공할 것이다.
예를 들어, 너의 역할이 카페 알바생이고, 사용자가 고객이라면, 너는 카페의 메뉴 구성 및 가격을 알고 있지만, 사용자는 모른다.
이때 사용자는 올바른 한국어를 구성하여 자신이 원하는 음료를 시켜야한다.

agentReply는 역할극 상대방의 발화(한국어)이다. 절대 선생님처럼 말하지마. 역할극에 몰입해.

JSON 응답 형식:
{
  "agentReply": "역할극 상대방의 발화(한국어)",
  "success": boolean, // 현재 task 성공 여부
  "nextTaskId": "다음 task 식별자 또는 null",
  "feedback": "교정/칭찬/힌트 요약",
  "score": 0-100 점수,
  "hints": ["추가 힌트 배열"]
}`

      scenarioSystemMessage = `
시나리오 제목: ${scenarioContext.title}
달성해야하는 작업들: ${scenarioContext.tasks.map((task: any) => task.ko).join(", ")}
역할: ${scenarioContext.role}
상대방 역할: ${scenarioContext.userRole}
`
    }
    
    if (BasicSystemPrompt && BasicSystemPrompt.trim().length > 0) {
      messages.push({ role: "system", content: BasicSystemPrompt })
    }
    if (scenarioSystemMessage && scenarioSystemMessage.trim().length > 0) {
      messages.push({ role: "system", content: scenarioSystemMessage })
    }

    // Use client memory only
    if (memoryHistory && Array.isArray(memoryHistory) && memoryHistory.length > 0) {
      memoryHistory.forEach((m) => {
        messages.push({ role: m.role, content: m.text })
      })
    }

    // Avoid duplicating the most recent user turn
    const expandedUserMessage = `
    currentTask: ${currentTask?.ko}
    userMessage: ${userMessage}
    `
    const last = messages[messages.length - 1]
    const shouldAppend = !last || last.role !== "user" || (String(last.content || "").trim() !== String(userMessage).trim())
    if (shouldAppend) {
      messages.push({ role: "user", content: expandedUserMessage })
    }

    // Call OpenAI Chat Completions API
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-5-mini"
    const requestBody: any = {
      model,
      messages,
    }

    // Use JSON mode for conversation practice
    if (scenarioContext && currentTask) {
      requestBody.response_format = { type: "json_object" }
    }

    // Debug: log outbound request body
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true") {
      console.log("[DEBUG] OpenAI Chat requestBody:", requestBody)
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
      if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true") {
        console.error("[DEBUG] OpenAI Chat error response:", {
          status: openaiResp.status,
          headers: Object.fromEntries(openaiResp.headers),
          body: errText,
        })
      }
      return NextResponse.json({ error: `LLM provider error: ${openaiResp.status} ${errText}` }, { status: 502 })
    }

    const data = (await openaiResp.json()) as any
    if (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEBUG_MODE === "true") {
      console.log("[DEBUG] OpenAI Chat success response:", {
        status: openaiResp.status,
        headers: Object.fromEntries(openaiResp.headers),
        data,
      })
    }
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
