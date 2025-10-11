"use client"

import { useParams, useRouter } from "next/navigation"
import { scenarios } from "@/lib/scenarios"
import { ConversationPractice } from "@/components/conversation-practice"
import { LearningProvider } from "@/contexts/LearningContext"

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  
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

  const handleBack = () => {
    router.push(`/scenario/${scenarioId}`)
  }

  return (
    <LearningProvider initialScenario={scenario}>
      <ConversationPractice 
        scenario={scenario} 
        onBack={handleBack}
        initialMessage={scenario.initialMessage}
      />
    </LearningProvider>
  )
}
