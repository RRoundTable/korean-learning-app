import { notFound } from "next/navigation"
import { getScenarioWithTasks } from "@/lib/data/scenarios"
import { ScenarioPageClient } from "./scenario-page-client"

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
