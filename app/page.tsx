"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Zap, Home, Menu, Search, Bell } from "lucide-react"
import { ScenarioCard } from "@/components/scenario-card"
import { ConversationPractice } from "@/components/conversation-practice"
import { Phrasebook } from "@/components/phrasebook"
import { ConversationProvider } from "@/contexts/ConversationContext"
import { coffeeShopScenario } from "@/lib/scenarios"
import Link from "next/link"

export default function KoreanLearningApp() {
  const [currentView, setCurrentView] = useState<"home" | "scenario" | "conversation" | "phrasebook">("home")
  const [selectedScenario, setSelectedScenario] = useState<any>(null)

  const scenarios = [
    {
      id: 1,
      title: "새 친구 사귀기",
      titleEn: "Making New Friends",
      description:
        "샌프란시스코에 사는 친구가 파티에 초대해 줘서 놀러 왔어요. 친구가 전부터 소개해주고 싶은 사람이 있다고 했었는데, 오늘 파티에서 드디어 만났네요!",
      descriptionEn: "Have a casual conversation with your new friend",
      emoji: "👋",
      isFree: true,
      tasks: [
        { ko: "새로 사귄 친구에 대해 질문을 해보세요", en: "Ask your new friend a question about themselves" },
        { ko: "자신의 고향과 하는 일에 대해 얘기해 보세요", en: "Talk about your hometown and job" },
        {
          ko: "새로 사귄 친구에게 다음 주말에 커피 마시러 가자고 해보세요",
          en: "Ask your new friend out for coffee next weekend",
        },
      ],
    },
    {
      id: 2,
      title: "유명 햄버거 체인점에서",
      titleEn: "At a Famous Burger Chain",
      description: "한국의 유명한 햄버거 체인점에서 주문하는 상황입니다.",
      descriptionEn: "Order food at a popular Korean burger chain",
      emoji: "🍔",
      isFree: false,
    },
    {
      id: 3,
      title: "나이키 매장에서",
      titleEn: "At Nike Store",
      description: "운동화를 사러 나이키 매장에 갔습니다.",
      descriptionEn: "Shopping for sneakers at Nike store",
      emoji: "👟",
      isFree: false,
    },
    {
      id: 4,
      title: "아늑한 동네 카페에서",
      titleEn: "At a Cozy Neighborhood Cafe",
      description: "동네 카페에서 커피를 주문하고 친구와 대화합니다.",
      descriptionEn: "Order coffee and chat with friends at a local cafe",
      emoji: "☕",
      isFree: false,
    },
  ]

  const handleScenarioSelect = (scenario: any) => {
    setSelectedScenario(scenario)
    setCurrentView("scenario")
  }

  const handleStartConversation = () => {
    setCurrentView("conversation")
  }

  const handleViewPhrasebook = () => {
    setCurrentView("phrasebook")
  }

  if (currentView === "conversation") {
    return (
      <ConversationProvider>
        <ConversationPractice scenario={coffeeShopScenario} onBack={() => setCurrentView("scenario")} />
      </ConversationProvider>
    )
  }

  if (currentView === "phrasebook") {
    return <Phrasebook onBack={() => setCurrentView("home")} />
  }

  if (currentView === "scenario") {
    return (
      <ScenarioCard
        scenario={selectedScenario}
        onBack={() => setCurrentView("home")}
        onStart={handleStartConversation}
        onViewPhrasebook={handleViewPhrasebook}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-primary">한국어</div>
              <div className="hidden md:block text-lg font-medium text-card-foreground">Korean Learning</div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              

              
            </nav>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hidden md:flex text-card-foreground">
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex text-card-foreground">
                <Bell className="w-4 h-4" />
              </Button>
              <Link href="/auth/signin">
                <Button variant="outline" className="hidden md:flex bg-transparent text-card-foreground border-border">
                  Sign In
                </Button>
              </Link>
              
              <Button variant="ghost" size="sm" className="md:hidden text-card-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section - Desktop optimized */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 text-balance">
            Learn Korean with
            <span className="text-primary"> Real Conversations</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Practice Korean through interactive scenarios and conversations with native speakers
          </p>

          {/* Premium CTA - Desktop layout */}
          <div className="max-w-md mx-auto mb-8">
            
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex bg-card rounded-xl p-2 gap-2 shadow-sm">
            <Button variant="ghost" className="rounded-lg px-6 text-muted-foreground hover:text-card-foreground">
              롤플레이
            </Button>
            <Button variant="default" className="rounded-lg px-6 bg-primary text-primary-foreground shadow-sm">
              📋 비즈니스 대화 💪
            </Button>
            <Button variant="ghost" className="rounded-lg px-6 text-muted-foreground hover:text-card-foreground">
              🗣️ OPIc 연습
            </Button>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Choose Your Learning Scenario</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {scenarios.map((scenario) => (
              <Card
                key={scenario.id}
                className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden group bg-card border-border"
                onClick={() => handleScenarioSelect(scenario)}
              >
                <CardContent className="p-6">
                  {scenario.isFree && (
                    <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">FREE</Badge>
                  )}
                  <div className="text-5xl mb-4 text-center group-hover:scale-110 transition-transform">
                    {scenario.emoji}
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-balance text-card-foreground">{scenario.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{scenario.titleEn}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16"></div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="flex justify-around py-3">
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-primary">
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span className="text-xs">Free Talk</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-muted-foreground">
            <Zap className="w-5 h-5" />
            <span className="text-xs">Review</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-muted-foreground">
            <Trophy className="w-5 h-5" />
            <span className="text-xs">Challenge</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
            </div>
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>

      <div className="md:hidden h-20"></div>
    </div>
  )
}
