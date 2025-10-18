import { notFound } from "next/navigation"
import { getScenarioWithTasks } from "@/lib/data/scenarios"
import { ConversationPageClient } from "./conversation-page-client"

interface ConversationPageProps {
  params: {
    id: string
  }
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const scenario = await getScenarioWithTasks(params.id)
  
  if (!scenario) {
    notFound()
  }

  return <ConversationPageClient scenario={scenario} />
}
