import { config } from 'dotenv';
import { db } from '../lib/db';
import { scenarios } from '../lib/scenarios';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: '.env.local' });

async function seedDatabase() {
  console.log('Starting database seed...');

  try {
    // Clear existing data (in case of re-seeding)
    console.log('Clearing existing data...');
    // Delete in reverse dependency order
    await db.execute('DELETE FROM messages');
    await db.execute('DELETE FROM audio_files');
    await db.execute('DELETE FROM sessions');
    await db.execute('DELETE FROM scenario_tasks');
    await db.execute('DELETE FROM scenarios');

    // Insert scenarios
    for (const scenario of scenarios) {
      const scenarioId = uuidv4();
      
      console.log(`Inserting scenario: ${scenario.title}`);
      
      await db.execute({
        sql: `INSERT INTO scenarios (
          id, title, title_en, role, user_role, description, description_en, 
          emoji, is_free, tts_voice, tts_instructions, stt_prompt,
          initial_message_text, initial_message_translation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          scenarioId,
          scenario.title,
          scenario.titleEn,
          scenario.role,
          scenario.userRole,
          scenario.description,
          scenario.descriptionEn,
          scenario.emoji,
          scenario.isFree ? 1 : 0,
          scenario.ttsVoice || null,
          scenario.ttsInstructions || null,
          scenario.sttPrompt || null,
          scenario.initialMessage?.text || null,
          scenario.initialMessage?.translation || null
        ]
      });

      // Insert tasks for this scenario
      if (scenario.tasks && scenario.tasks.length > 0) {
        for (let i = 0; i < scenario.tasks.length; i++) {
          const task = scenario.tasks[i];
          const taskId = uuidv4();
          
          await db.execute({
            sql: `INSERT INTO scenario_tasks (id, scenario_id, idx, ko, en) VALUES (?, ?, ?, ?, ?)`,
            args: [taskId, scenarioId, i, task.ko, task.en]
          });
        }
      }
    }

    console.log('Database seed completed successfully!');
    
    // Verify the data
    const scenarioCount = await db.execute('SELECT COUNT(*) as count FROM scenarios');
    const taskCount = await db.execute('SELECT COUNT(*) as count FROM scenario_tasks');
    
    console.log(`Inserted ${scenarioCount.rows[0].count} scenarios and ${taskCount.rows[0].count} tasks`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
