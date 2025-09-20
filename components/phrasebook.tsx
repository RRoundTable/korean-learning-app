"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Volume2, Bookmark } from "lucide-react"

interface PhrasebookProps {
  onBack: () => void
}

export function Phrasebook({ onBack }: PhrasebookProps) {
  const savedPhrases: any[] = []

  const starterPhrases = [
    {
      english: "Hi. Nice to meet you!",
      korean: "안녕하세요, 만나서 반가워요!",
    },
    {
      english: "So, tell me about yourself!",
      korean: "자기소개 좀 해주세요!",
    },
    {
      english: "Are you from around here?",
      korean: "여기 주변에 사세요?",
    },
    {
      english: "What do you do for fun?",
      korean: "취미로 뭐 하세요?",
    },
    {
      english: "What do you do for work?",
      korean: "무슨 일 하세요?",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold">Phrasebook</h1>
        <div className="w-10"></div>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto">
        {/* My Saved Phrases */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">My Saved Phrases</h2>

          {savedPhrases.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-pretty">
                  Add phrases to your Phrasebook by saving lines from your lesson.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {savedPhrases.map((phrase, index) => (
                <Card key={index} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Button variant="ghost" size="sm" className="p-2 flex-shrink-0">
                        <Volume2 className="w-4 h-4 text-primary" />
                      </Button>
                      <div className="flex-1">
                        <p className="font-medium mb-1">{phrase.english}</p>
                        <p className="text-sm text-muted-foreground">{phrase.korean}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="p-2 flex-shrink-0">
                        <Bookmark className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Starter Phrases */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">Starter Phrases</h2>
          <div className="space-y-3">
            {starterPhrases.map((phrase, index) => (
              <Card key={index} className="bg-card hover:bg-card/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Button variant="ghost" size="sm" className="p-2 flex-shrink-0">
                      <Volume2 className="w-4 h-4 text-primary" />
                    </Button>
                    <div className="flex-1">
                      <p className="font-medium mb-1">{phrase.english}</p>
                      <p className="text-sm text-muted-foreground">{phrase.korean}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="p-2 flex-shrink-0">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Practice Button */}
        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-8">
          Practice Saved Phrases
        </Button>
      </div>
    </div>
  )
}
