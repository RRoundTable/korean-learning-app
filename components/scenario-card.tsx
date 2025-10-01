"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Clock, Bookmark } from "lucide-react"

interface ScenarioCardProps {
  scenario: any
  onBack: () => void
  onStart: () => void
  onViewPhrasebook: () => void
}

export function ScenarioCard({ scenario, onBack, onStart, onViewPhrasebook }: ScenarioCardProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-balance">{scenario.title}</h1>
        <Button variant="ghost" size="sm" className="p-2">
          <Clock className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto">
        {/* Scenario Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">Scenario</h2>
          <p className="text-sm leading-relaxed text-pretty mb-4">{scenario.description}</p>
        </div>

        {/* Goal Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">Goal</h2>
          <Card className="bg-card">
            <CardContent className="p-4">
              <p className="font-medium mb-2">{scenario.goal}</p>
              <p className="text-sm text-muted-foreground">{scenario.goalEn}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Section */}
        {scenario.tasks && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">Tasks</h2>
            <div className="space-y-4">
              {scenario.tasks.map((task: any, index: number) => (
                <Card key={index} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <p className="font-medium mb-1">{task.ko}</p>
                        <p className="text-sm text-muted-foreground">{task.en}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* View Phrasebook Button */}
        

        {/* Start Button */}
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-8" onClick={onStart}>
          Start
        </Button>
      </div>
    </div>
  )
}
