"use client"

import { useRouter } from "next/navigation"
import { ConversationPractice } from "@/components/conversation-practice"
import { LearningProvider } from "@/contexts/LearningContext"
import { ScenarioWithTasks } from "@/lib/data/scenarios"

interface ConversationPageClientProps {
  scenario: ScenarioWithTasks
}

export function ConversationPageClient({ scenario }: ConversationPageClientProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/scenario/${scenario.id}`)
  }

  // Convert database scenario to the format expected by ConversationPractice
  const scenarioForComponent = {
    id: scenario.id,
    title: scenario.title,
    titleEn: scenario.title_en,
    role: scenario.role,
    userRole: scenario.user_role,
    description: scenario.description,
    descriptionEn: scenario.description_en,
    emoji: scenario.emoji || "",
    isFree: scenario.is_free === 1,
    tasks: scenario.tasks.map(task => ({
      ko: task.ko,
      en: task.en
    })),
    ttsVoice: scenario.tts_voice,
    ttsInstructions: scenario.tts_instructions,
    sttPrompt: scenario.stt_prompt
  }

  // Create initial message from database data
  const initialMessage = scenario.initial_message_text && scenario.initial_message_translation ? {
    text: scenario.initial_message_text,
    translation: scenario.initial_message_translation
  } : undefined

  return (
    <LearningProvider initialScenario={scenarioForComponent}>
      <ConversationPractice 
        scenario={scenarioForComponent} 
        onBack={handleBack}
        initialMessage={initialMessage}
      />
    </LearningProvider>
  )
}
