import { notFound } from "next/navigation"
import { getScenarioWithTasks } from "@/lib/data/scenarios"
import { ScenarioPageClient } from "./scenario-page-client"

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

interface ScenarioPageProps {
  params: {
    id: string
  }
}

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const scenario = await getScenarioWithTasks(params.id)
  
  if (!scenario) {
    notFound()
  }

  return <ScenarioPageClient scenario={scenario} />
}
