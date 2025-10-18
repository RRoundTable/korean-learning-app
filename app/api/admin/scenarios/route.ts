import { NextRequest, NextResponse } from 'next/server';
import { 
  getAdminScenarios, 
  createAdminScenario 
} from '@/lib/data/admin-scenarios';
import { 
  ListScenariosQuerySchema, 
  CreateScenarioSchema,
  ScenarioListResponseSchema 
} from '@/lib/types/admin';
import { z } from 'zod';

export const runtime = 'nodejs';

// GET /api/admin/scenarios - List scenarios with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const query = ListScenariosQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const result = await getAdminScenarios(query);
    
    // Validate response
    const validatedResult = ScenarioListResponseSchema.parse(result);
    
    return NextResponse.json(validatedResult);
  } catch (error) {
    console.error('Error in GET /api/admin/scenarios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scenarios - Create new scenario
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = CreateScenarioSchema.parse(body);
    
    const scenario = await createAdminScenario(validatedData);
    
    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/scenarios:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
