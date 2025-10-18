import { db } from '../db';

export interface DatabaseScenario {
  id: string;
  title: string;
  title_en: string;
  role: string;
  user_role: string;
  description: string;
  description_en: string;
  emoji: string | null;
  is_free: number;
  tts_voice: string | null;
  tts_instructions: string | null;
  stt_prompt: string | null;
  initial_message_text: string | null;
  initial_message_translation: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTask {
  id: string;
  scenario_id: string;
  idx: number;
  ko: string;
  en: string;
}

export interface ScenarioWithTasks extends DatabaseScenario {
  tasks: DatabaseTask[];
}

// Helper function to convert database rows to plain objects
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Get all public scenarios (for main page)
export async function getScenarios(): Promise<DatabaseScenario[]> {
  try {
    const result = await db.execute(`
      SELECT * FROM scenarios 
      WHERE status = 'public'
      ORDER BY created_at ASC
    `);
    
    // Convert to plain objects to avoid serialization warnings
    return result.rows.map(row => toPlainObject(row)) as DatabaseScenario[];
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    throw new Error('Failed to fetch scenarios');
  }
}

// Get a single public scenario with its tasks
export async function getScenarioWithTasks(id: string): Promise<ScenarioWithTasks | null> {
  try {
    // Get scenario (only public ones)
    const scenarioResult = await db.execute({
      sql: 'SELECT * FROM scenarios WHERE id = ? AND status = ?',
      args: [id, 'public']
    });
    
    if (scenarioResult.rows.length === 0) {
      return null;
    }
    
    const scenario = toPlainObject(scenarioResult.rows[0]) as DatabaseScenario;
    
    // Get tasks for this scenario
    const tasksResult = await db.execute({
      sql: 'SELECT * FROM scenario_tasks WHERE scenario_id = ? ORDER BY idx ASC',
      args: [id]
    });
    
    const tasks = tasksResult.rows.map(row => toPlainObject(row)) as DatabaseTask[];
    
    return {
      ...scenario,
      tasks
    };
  } catch (error) {
    console.error('Error fetching scenario with tasks:', error);
    throw new Error('Failed to fetch scenario with tasks');
  }
}

// Get all scenarios (for admin page - includes all statuses)
export async function getAllScenarios(): Promise<DatabaseScenario[]> {
  try {
    const result = await db.execute(`
      SELECT * FROM scenarios 
      ORDER BY created_at ASC
    `);
    
    // Convert to plain objects to avoid serialization warnings
    return result.rows.map(row => toPlainObject(row)) as DatabaseScenario[];
  } catch (error) {
    console.error('Error fetching all scenarios:', error);
    throw new Error('Failed to fetch all scenarios');
  }
}

// Get scenario by legacy numeric ID (for backward compatibility)
export async function getScenarioByLegacyId(legacyId: number): Promise<ScenarioWithTasks | null> {
  try {
    // This would require adding a legacy_id column to scenarios table
    // For now, we'll return null as this is not implemented yet
    console.warn('getScenarioByLegacyId not implemented yet');
    return null;
  } catch (error) {
    console.error('Error fetching scenario by legacy ID:', error);
    throw new Error('Failed to fetch scenario by legacy ID');
  }
}
