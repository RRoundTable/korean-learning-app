import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Input validation schema
const LogMessageSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(['user', 'assistant', 'feedback']),
  text: z.string().min(1),
  displayText: z.string().optional(),
  taskIdx: z.number().int().min(0).optional(),
  showMsg: z.boolean().optional(),
});

// Response schema
const LogMessageResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'feedback']),
  text: z.string(),
  displayText: z.string().nullable(),
  taskIdx: z.number().int().nullable(),
  showMsg: z.number().int().nullable(),
  createdAt: z.string(),
});

export type LogMessageInput = z.infer<typeof LogMessageSchema>;
export type LogMessageResponse = z.infer<typeof LogMessageResponseSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const parseResult = LogMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const validatedData = parseResult.data;
    
    // Generate UUID for the message
    const messageId = uuidv4();
    
    // Insert message into database
    const result = await db.execute({
      sql: `INSERT INTO messages (
        id, session_id, role, text, display_text, task_idx, show_msg
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        messageId,
        validatedData.sessionId,
        validatedData.role,
        validatedData.text,
        validatedData.displayText || null,
        validatedData.taskIdx || null,
        validatedData.showMsg ? 1 : 0,
      ]
    });

    // Fetch the created message to return
    const createdMessage = await db.execute({
      sql: `SELECT * FROM messages WHERE id = ?`,
      args: [messageId]
    });

    if (createdMessage.rows.length === 0) {
      throw new Error('Failed to create message');
    }

    const message = createdMessage.rows[0] as any;
    
    // Validate response
    const response: LogMessageResponse = {
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      text: message.text,
      displayText: message.display_text,
      taskIdx: message.task_idx,
      showMsg: message.show_msg,
      createdAt: message.created_at,
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error logging message:', error);
    
    return NextResponse.json(
      { error: 'Failed to log message' },
      { status: 500 }
    );
  }
}
