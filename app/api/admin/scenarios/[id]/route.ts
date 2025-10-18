import { NextRequest, NextResponse } from 'next/server';
import { 
  getAdminScenario, 
  updateAdminScenario, 
  deleteAdminScenario 
} from '@/lib/data/admin-scenarios';
import { 
  UpdateScenarioSchema,
  ScenarioResponseSchema 
} from '@/lib/types/admin';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/admin/scenarios/[id] - Get single scenario
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const scenario = await getAdminScenario(params.id);
    
    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      );
    }
    
    // Validate response
    const validatedScenario = ScenarioResponseSchema.parse(scenario);
    
    return NextResponse.json(validatedScenario);
  } catch (error) {
    console.error('Error in GET /api/admin/scenarios/[id]:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch scenario' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scenarios/[id] - Update scenario
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = UpdateScenarioSchema.parse({
      ...body,
      id: params.id,
    });
    
    const scenario = await updateAdminScenario(validatedData);
    
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error in PUT /api/admin/scenarios/[id]:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update scenario' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scenarios/[id] - Delete scenario
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await deleteAdminScenario(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/scenarios/[id]:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}
