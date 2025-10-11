"use client"

import { useParams, useRouter } from "next/navigation"
import { scenarios, Scenario } from "@/lib/scenarios"
import { ScenarioCard } from "@/components/scenario-card"
import { useState } from "react"
import { Phrasebook } from "@/components/phrasebook"

export default function ScenarioPage() {
  const params = useParams()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<"scenario" | "phrasebook">("scenario")
  
  const scenarioId = parseInt(params.id as string)
  const scenario = scenarios.find(s => s.id === scenarioId)

  if (!scenario) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Scenario not found</h1>
          <button 
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  const handleStartConversation = () => {
    router.push(`/scenario/${scenarioId}/conversation`)
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

  return (
    <ScenarioCard
      scenario={scenario}
      onBack={handleBack}
      onStart={handleStartConversation}
      onViewPhrasebook={handleViewPhrasebook}
    />
  )
}
