"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, Languages, Eye, Bookmark, Mic, X, ArrowUp, Settings, Lightbulb } from "lucide-react"

interface ConversationPracticeProps {
  scenario: any
  onBack: () => void
}

export function ConversationPractice({ scenario, onBack }: ConversationPracticeProps) {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const currentTask = scenario.tasks?.[currentTaskIndex]

  const messages = [
    {
      id: 1,
      text: "Hi, I'm Robin! Are you Amy's friend?",
      translation: "안녕하세요, 저는 로빈이에요! 에이미 친구맞으세요?",
      isUser: false,
    },
    {
      id: 2,
      text: "",
      hint: "I really like kimchi and bulgogi.",
      isUser: true,
      isWaiting: true,
    },
  ]

  const handleMicPress = () => {
    setIsListening(!isListening)
  }

  const handleTranslation = () => {
    setShowTranslation(!showTranslation)
  }

  const handleHint = () => {
    setShowHint(!showHint)
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const AudioVisualization = () => (
    <div className="flex items-center justify-center gap-1 py-4">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 40 + 10}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-balance">{scenario.title}</h1>
        <Button variant="ghost" size="sm" className="p-2">
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Tasks ({currentTaskIndex}/{scenario.tasks?.length || 3} completed)
          </span>
          <Button variant="ghost" size="sm" className="p-1">
            <div className="flex flex-col gap-0.5">
              <div className="w-3 h-0.5 bg-current"></div>
              <div className="w-3 h-0.5 bg-current"></div>
            </div>
          </Button>
        </div>
      </div>

      {/* Current Task */}
      <div className="px-4 py-3 bg-muted/30">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
          </div>
          <p className="text-sm font-medium">{currentTask?.ko || "새로 사귄 친구에 대해 질문을 해보세요"}</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] md:max-w-[70%] ${message.isUser ? "order-2" : "order-1"}`}>
                <Card className={`${message.isUser ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  <CardContent className="p-4">
                    {!message.isUser ? (
                      <>
                        <p className="font-medium mb-3">{message.text}</p>
                        {showTranslation && <p className="text-sm opacity-70 mb-3">{message.translation}</p>}
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={handleTranslation}>
                            <Languages className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`p-1.5 h-auto ml-auto ${isSaved ? "text-primary" : ""}`}
                            onClick={handleSave}
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        {message.isWaiting && !isListening && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm opacity-70">Press Record</span>
                            <Button variant="ghost" size="sm" className="p-1.5 h-auto" onClick={handleHint}>
                              <Lightbulb className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {isListening && (
                          <>
                            <span className="text-sm opacity-70 mb-2 block">Speak now...</span>
                            <AudioVisualization />
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showHint && (
        <div className="px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-sm">
                    <span className="font-medium text-primary">TRY SAYING:</span>
                    <p className="mt-1">I really like kimchi and bulgogi.</p>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-1.5 h-auto">
                      <Languages className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="p-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {isListening && (
              <Button
                variant="outline"
                size="lg"
                className="w-16 h-16 rounded-full bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                onClick={() => setIsListening(false)}
              >
                <X className="w-6 h-6 text-destructive" />
              </Button>
            )}

            <Button
              size="lg"
              className={`w-20 h-20 rounded-full ${
                isListening ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"
              }`}
              onClick={handleMicPress}
            >
              {isListening ? <ArrowUp className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
