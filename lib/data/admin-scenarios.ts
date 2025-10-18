import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateScenarioInput, 
  UpdateScenarioInput, 
  ListScenariosQuery,
  ScenarioListResponse,
  ScenarioResponse,
  ScenarioStatus 
} from '../types/admin';

// Get all scenarios with filtering and pagination
export async function getAdminScenarios(query: ListScenariosQuery): Promise<ScenarioListResponse> {
  try {
    const { status, search, page, limit } = query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const args: any[] = [];

    if (status) {
      whereConditions.push('s.status = ?');
      args.push(status);
    }

    if (search) {
      whereConditions.push('(s.title LIKE ? OR s.title_en LIKE ? OR s.description LIKE ? OR s.description_en LIKE ?)');
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await db.execute({
      sql: `
        SELECT COUNT(*) as total 
        FROM scenarios s 
        ${whereClause}
      `,
      args
    });
    const total = countResult.rows[0].total as number;
    const totalPages = Math.ceil(total / limit);

    // Get scenarios with task count
    const scenariosResult = await db.execute({
      sql: `
        SELECT 
          s.*,
          COUNT(st.id) as task_count
        FROM scenarios s
        LEFT JOIN scenario_tasks st ON s.id = st.scenario_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, limit, offset]
    });

    const scenarios = scenariosResult.rows.map(row => ({
      id: row.id as string,
      title: row.title as string,
      title_en: row.title_en as string,
      role: row.role as string,
      user_role: row.user_role as string,
      description: row.description as string,
      description_en: row.description_en as string,
      emoji: row.emoji as string | null,
      is_free: row.is_free as number,
      tts_voice: row.tts_voice as string | null,
      tts_instructions: row.tts_instructions as string | null,
      stt_prompt: row.stt_prompt as string | null,
      initial_message_text: row.initial_message_text as string | null,
      initial_message_translation: row.initial_message_translation as string | null,
      status: row.status as ScenarioStatus,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      task_count: row.task_count as number,
    }));

    return {
      scenarios,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  } catch (error) {
    console.error('Error fetching admin scenarios:', error);
    throw new Error('Failed to fetch scenarios');
  }
}

// Get single scenario with tasks
export async function getAdminScenario(id: string): Promise<ScenarioResponse | null> {
  try {
    // Get scenario
    const scenarioResult = await db.execute({
      sql: 'SELECT * FROM scenarios WHERE id = ?',
      args: [id]
    });

    if (scenarioResult.rows.length === 0) {
      return null;
    }

    const scenario = scenarioResult.rows[0];

    // Get tasks
    const tasksResult = await db.execute({
      sql: 'SELECT * FROM scenario_tasks WHERE scenario_id = ? ORDER BY idx ASC',
      args: [id]
    });

    const tasks = tasksResult.rows.map(row => ({
      id: row.id as string,
      scenario_id: row.scenario_id as string,
      idx: row.idx as number,
      ko: row.ko as string,
      en: row.en as string,
    }));

    return {
      id: scenario.id as string,
      title: scenario.title as string,
      title_en: scenario.title_en as string,
      role: scenario.role as string,
      user_role: scenario.user_role as string,
      description: scenario.description as string,
      description_en: scenario.description_en as string,
      emoji: scenario.emoji as string | null,
      is_free: scenario.is_free as number,
      tts_voice: scenario.tts_voice as string | null,
      tts_instructions: scenario.tts_instructions as string | null,
      stt_prompt: scenario.stt_prompt as string | null,
      initial_message_text: scenario.initial_message_text as string | null,
      initial_message_translation: scenario.initial_message_translation as string | null,
      status: scenario.status as ScenarioStatus,
      created_at: scenario.created_at as string,
      updated_at: scenario.updated_at as string,
      tasks,
    };
  } catch (error) {
    console.error('Error fetching admin scenario:', error);
    throw new Error('Failed to fetch scenario');
  }
}

// Create new scenario
export async function createAdminScenario(data: CreateScenarioInput): Promise<ScenarioResponse> {
  try {
    const scenarioId = uuidv4();
    
    // Insert scenario
    await db.execute({
      sql: `
        INSERT INTO scenarios (
          id, title, title_en, role, user_role, description, description_en,
          emoji, is_free, tts_voice, tts_instructions, stt_prompt,
          initial_message_text, initial_message_translation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        scenarioId,
        data.title,
        data.title_en,
        data.role,
        data.user_role,
        data.description,
        data.description_en,
        data.emoji || null,
        data.is_free ? 1 : 0,
        data.tts_voice || null,
        data.tts_instructions || null,
        data.stt_prompt || null,
        data.initial_message_text || null,
        data.initial_message_translation || null,
        data.status,
      ]
    });

    // Insert tasks
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i];
      const taskId = uuidv4();
      
      await db.execute({
        sql: 'INSERT INTO scenario_tasks (id, scenario_id, idx, ko, en) VALUES (?, ?, ?, ?, ?)',
        args: [taskId, scenarioId, i, task.ko, task.en]
      });
    }

    // Return created scenario
    const createdScenario = await getAdminScenario(scenarioId);
    if (!createdScenario) {
      throw new Error('Failed to retrieve created scenario');
    }

    return createdScenario;
  } catch (error) {
    console.error('Error creating scenario:', error);
    throw new Error('Failed to create scenario');
  }
}

// Update scenario
export async function updateAdminScenario(data: UpdateScenarioInput): Promise<ScenarioResponse> {
  try {
    // Update scenario
    await db.execute({
      sql: `
        UPDATE scenarios SET
          title = ?, title_en = ?, role = ?, user_role = ?, description = ?, description_en = ?,
          emoji = ?, is_free = ?, tts_voice = ?, tts_instructions = ?, stt_prompt = ?,
          initial_message_text = ?, initial_message_translation = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        data.title,
        data.title_en,
        data.role,
        data.user_role,
        data.description,
        data.description_en,
        data.emoji || null,
        data.is_free ? 1 : 0,
        data.tts_voice || null,
        data.tts_instructions || null,
        data.stt_prompt || null,
        data.initial_message_text || null,
        data.initial_message_translation || null,
        data.status,
        data.id,
      ]
    });

    // Update tasks if provided
    if (data.tasks) {
      // Delete existing tasks
      await db.execute({
        sql: 'DELETE FROM scenario_tasks WHERE scenario_id = ?',
        args: [data.id]
      });

      // Insert new tasks
      for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i];
        const taskId = task.id || uuidv4();
        
        await db.execute({
          sql: 'INSERT INTO scenario_tasks (id, scenario_id, idx, ko, en) VALUES (?, ?, ?, ?, ?)',
          args: [taskId, data.id, i, task.ko, task.en]
        });
      }
    }

    // Return updated scenario
    const updatedScenario = await getAdminScenario(data.id);
    if (!updatedScenario) {
      throw new Error('Failed to retrieve updated scenario');
    }

    return updatedScenario;
  } catch (error) {
    console.error('Error updating scenario:', error);
    throw new Error('Failed to update scenario');
  }
}

// Update scenario status
export async function updateScenarioStatus(id: string, status: ScenarioStatus): Promise<ScenarioResponse> {
  try {
    await db.execute({
      sql: 'UPDATE scenarios SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [status, id]
    });

    const updatedScenario = await getAdminScenario(id);
    if (!updatedScenario) {
      throw new Error('Failed to retrieve updated scenario');
    }

    return updatedScenario;
  } catch (error) {
    console.error('Error updating scenario status:', error);
    throw new Error('Failed to update scenario status');
  }
}

// Delete scenario
export async function deleteAdminScenario(id: string): Promise<void> {
  try {
    // Delete in order due to foreign key constraints
    await db.execute({
      sql: 'DELETE FROM scenario_tasks WHERE scenario_id = ?',
      args: [id]
    });

    await db.execute({
      sql: 'DELETE FROM scenarios WHERE id = ?',
      args: [id]
    });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    throw new Error('Failed to delete scenario');
  }
}
