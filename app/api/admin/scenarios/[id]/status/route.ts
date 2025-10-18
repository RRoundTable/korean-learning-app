import { NextRequest, NextResponse } from 'next/server';
import { updateScenarioStatus } from '@/lib/data/admin-scenarios';
import { UpdateStatusSchema, ScenarioResponseSchema } from '@/lib/types/admin';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// PATCH /api/admin/scenarios/[id]/status - Update scenario status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateStatusSchema.parse(body);
    
    const scenario = await updateScenarioStatus(params.id, validatedData.status);
    
    // Validate response
    const validatedScenario = ScenarioResponseSchema.parse(scenario);
    
    return NextResponse.json(validatedScenario);
  } catch (error) {
    console.error('Error in PATCH /api/admin/scenarios/[id]/status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update scenario status' },
      { status: 500 }
    );
  }
}
