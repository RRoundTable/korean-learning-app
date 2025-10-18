"use client"

import { useRouter } from "next/navigation"
import { ScenarioCard } from "@/components/scenario-card"
import { useState } from "react"
import { Phrasebook } from "@/components/phrasebook"
import { ScenarioWithTasks } from "@/lib/data/scenarios"

interface ScenarioPageClientProps {
  scenario: ScenarioWithTasks
}

export function ScenarioPageClient({ scenario }: ScenarioPageClientProps) {
  const router = useRouter()
  const [currentView, setCurrentView] = useState<"scenario" | "phrasebook">("scenario")

  const handleStartConversation = () => {
    router.push(`/scenario/${scenario.id}/conversation`)
  }

  const handleViewPhrasebook = () => {
    setCurrentView("phrasebook")
  }

  const handleBack = () => {
    router.push("/")
  }

  if (currentView === "phrasebook") {
    return <Phrasebook onBack={() => setCurrentView("scenario")} />
  }

  // Convert database scenario to the format expected by ScenarioCard
  const scenarioForCard = {
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
    }))
  }

  return (
    <ScenarioCard
      scenario={scenarioForCard}
      onBack={handleBack}
      onStart={handleStartConversation}
      onViewPhrasebook={handleViewPhrasebook}
    />
  )
}
