import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Input validation schema
const CreateSessionSchema = z.object({
  sessionId: z.string().min(1),
  scenarioId: z.string().min(1),
  userId: z.string().optional(),
});

// Response schema
const SessionResponseSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  userId: z.string().nullable(),
  createdAt: z.string(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const parseResult = CreateSessionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const validatedData = parseResult.data;
    
    // Check if session already exists
    const existingSession = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ?',
      args: [validatedData.sessionId]
    });

    if (existingSession.rows.length > 0) {
      return NextResponse.json({
        id: validatedData.sessionId,
        scenarioId: validatedData.scenarioId,
        userId: validatedData.userId || null,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Create new session
    await db.execute({
      sql: `INSERT INTO sessions (id, scenario_id, user_id) VALUES (?, ?, ?)`,
      args: [
        validatedData.sessionId,
        validatedData.scenarioId,
        validatedData.userId || null,
      ]
    });

    const response: SessionResponse = {
      id: validatedData.sessionId,
      scenarioId: validatedData.scenarioId,
      userId: validatedData.userId || null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error creating session:', error);
    
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}