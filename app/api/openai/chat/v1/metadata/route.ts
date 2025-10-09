// DEPRECATED: This route is superseded by check-success and hint routes.
import { NextRequest, NextResponse } from "next/server"
import { ChatInputSchema } from "../../_shared"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const parsed = ChatInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  return NextResponse.json({
    error: "This endpoint is deprecated. Use /api/openai/chat/check-success and /api/openai/chat/hint.",
  }, { status: 410 })
}


