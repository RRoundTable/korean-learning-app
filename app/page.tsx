"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Zap, Home, Menu, Search, Bell } from "lucide-react"
import { ScenarioCard } from "@/components/scenario-card"
import { ConversationPractice } from "@/components/conversation-practice"
import { Phrasebook } from "@/components/phrasebook"
import { LearningProvider } from "@/contexts/LearningContext"
import Link from "next/link"

interface InitialMessage {
  text: string
  translation: string
}


interface Task {
  ko: string
  en: string
}

interface Scenario {
  id: number
  title: string
  titleEn: string
  role: string
  userRole: string
  description: string
  descriptionEn: string
  emoji: string
  isFree: boolean
  initialMessage?: InitialMessage
  tasks?: Task[]
  ttsVoice?: string
  ttsInstructions?: string
}

export default function KoreanLearningApp() {
  const [currentView, setCurrentView] = useState<"home" | "scenario" | "conversation" | "phrasebook">("home")
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)

 const scenarios: Scenario[] = [
    {
      id: 1,
      title: "로빈과 약속잡기",
      titleEn: "Making New Friends",
      role: "로빈",
      userRole: "친구 파티에서 만난 사람",
      description:
        "로빈과 친구 파티에서 만났다. 로빈의 취미는 카페를 가는 것을 좋아한다. 로빈과 약속을 잡아보자.",
      descriptionEn: "Have a casual conversation with your new friend",
      emoji: "🍷",
      isFree: true,
      initialMessage: {
        text: "안녕하세요! 저는 로빈이에요.",
        translation: "Hi, I'm Robin! Are you Amy's friend?",
      },
      
      tasks: [
        { ko: "로빈에게 인사와 함께 자기소개를 하세요.", en: "Introduce yourself and greet Robin" },
        { ko: "로빈의 취미에 대해서 물어보세요.", en: "Ask about Robin's hobbies" },
        { ko: "좋아하는 음료 종류를 물어보세요.", en: "Ask about the favorite drink" },
        { ko: "로빈과 자유로운 대화를 나눠보세요.", en: "Have a free conversation with Robin" },
        {
          ko: "로빈과 다음 주말에 커피 마시러 가자고 해보세요.",
          en: "Ask Robin out for coffee next weekend",
        },
      ],
      ttsVoice: "nova",
      ttsInstructions: "Speak in a warm, friendly tone as if meeting a new friend. Be enthusiastic and welcoming. Sound like you're genuinely excited to meet someone new.",
    },
    {
      id: 2,
      title: "예산에 맞는 햄버거 세트 주문하기",
      titleEn: "At a Famous Burger Chain",
      role: "패스트푸드점 직원",
      userRole: "손님",
      description: "햄버거 전문점으로 다양한 종류의 햄버거를 판매합니다. 소고기 버거, 치킨 버거, 새우버거를 판매중입니다. \
      단품 버거 가격은 다음과 같습니다.\
      - 소고기 버거: 8000원\
      - 치킨 버거: 8000원\
      - 새우버거: 9000원\
      사이드 메뉴로는 감자튀김, 치즈스틱, 콜라가 있습니다. \
      감자튀김: 4000원 \
      치즈스틱: 5000원 \
      콜라: 2000원  \
      제로콜라: 2000원 \
      버거 세트 가격은 다음과 같습니다. 세트에는 감자튀김과 치즈스틱 중 하나, 콜라 또는 제로콜라를 선택할 수 있습니다. \
      - 소고기 버거 세트: 15000원 \
      - 치킨 버거 세트: 15000원 \
      - 새우버거 세트: 16000원 \
      버거 세트는 버거와 사이드 메뉴를 함께 제공합니다.\
      ",
      descriptionEn: "This is a burger chain where you can order a burger set. Order a burger set within budget and complete payment.",
      emoji: "🍔",
      isFree: false,
      initialMessage: {
        text: "안녕하세요! 주문 도와드릴까요?",
        translation: "Hello! I'll help you with your order.",
      },
      
      tasks: [
        { ko: "어떤 버거종류가 있는지 물어보세요.", en: "Ask about the menu" },
        { ko: "원하는 버거의 가격을 물어보세요.", en: "Ask about the price" },
        { ko: "사이드 메뉴를 물어보세요.", en: "Ask about side menu options" },
        { ko: "제로콜라가 있는지 물어보세요.", en: "Ask if there is zero cola" },
        { ko: "제로콜라를 포함한 버거 세트 주문을 완료하세요.", en: "Complete the order" },
      ],
      ttsVoice: "nova",
      ttsInstructions: "Speak in a friendly, helpful service tone. Be enthusiastic and welcoming. Sound like a friendly fast-food employee who wants to help.",
    },
    {
      id: 3,
      title: "나이키 매장에서",
      titleEn: "At Nike Store",
      role: "매장 직원",
      userRole: "러닝화를 사러 온 손님",
      description: "운동화를 사러 나이키 매장에 갔습니다.",
      descriptionEn: "Shopping for sneakers at Nike store",
      emoji: "👟",
      isFree: false,
      initialMessage: {
        text: "안녕하세요! 찾으시는 신발이 있으신가요?",
        translation: "Hello! Welcome to Nike store. What kind of sneakers are you looking for?",
      },
      
      tasks: [
        { ko: "점원에게 찾고 있는 신발 종류를 말해보세요.", en: "Describe the style of sneakers you want" },
        { ko: "점원에게 찾는 신발사이즈를 말해보세요.", en: "Tell the staff your shoe size" },
        { ko: "신발 사이즈가 크네요. 점원에게 더 큰 신발 사이즈를 요청해보세요.", en: "Ask for a larger shoe size" },
        { ko: "할인 행사를 하고 있는지 물어보세요.", en: "Ask if there are any discount sales" },
        { ko: "카드결제를 하고 싶다고 말해보세요.", en: "Say you want to pay by card" },
      ],
      ttsVoice: "coral",
      ttsInstructions: "Speak in an energetic, helpful retail assistant tone. Be enthusiastic about products and helpful to customers. Sound like a knowledgeable shoe salesperson.",
    }
   
  ]

  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setCurrentView("scenario")
  }

  const handleStartConversation = () => {
    setCurrentView("conversation")
  }

  const handleViewPhrasebook = () => {
    setCurrentView("phrasebook")
  }

  if (currentView === "conversation" && selectedScenario) {
    return (
      <LearningProvider initialScenario={selectedScenario}>
        <ConversationPractice 
          scenario={selectedScenario} 
          onBack={() => setCurrentView("scenario")}
          initialMessage={selectedScenario.initialMessage}
        />
      </LearningProvider>
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
