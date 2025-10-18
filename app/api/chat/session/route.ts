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
    
    console.log('🔧 Creating session with:', { 
      sessionId: validatedData.sessionId, 
      scenarioId: validatedData.scenarioId 
    });
    
    // Check if scenario exists
    const scenarioExists = await db.execute({
      sql: 'SELECT id FROM scenarios WHERE id = ?',
      args: [validatedData.scenarioId]
    });
    
    if (scenarioExists.rows.length === 0) {
      console.error('❌ Scenario not found:', validatedData.scenarioId);
      return NextResponse.json(
        { error: 'Scenario not found', scenarioId: validatedData.scenarioId },
        { status: 404 }
      );
    }
    
    console.log('✅ Scenario exists:', validatedData.scenarioId);
    
    // Check if session already exists
    const existingSession = await db.execute({
      sql: 'SELECT id FROM sessions WHERE id = ?',
      args: [validatedData.sessionId]
    });

    if (existingSession.rows.length > 0) {
      console.log('✅ Session already exists:', validatedData.sessionId);
      return NextResponse.json({
        id: validatedData.sessionId,
        scenarioId: validatedData.scenarioId,
        userId: validatedData.userId || null,
        createdAt: new Date().toISOString(),
      });
    }
    
    // Create new session
    console.log('📝 Creating new session...');
    await db.execute({
      sql: `INSERT INTO sessions (id, scenario_id, user_id) VALUES (?, ?, ?)`,
      args: [
        validatedData.sessionId,
        validatedData.scenarioId,
        validatedData.userId || null,
      ]
    });
    
    console.log('✅ Session created successfully');

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
      { 
        error: 'Failed to create session',
        details: error instanceof Error ? error.message : String(error),
        sessionId: validatedData?.sessionId,
        scenarioId: validatedData?.scenarioId
      },
      { status: 500 }
    );
  }
}