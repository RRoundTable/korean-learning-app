import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Zap, Home, Menu, Search, Bell } from "lucide-react"
import Link from "next/link"
import { getScenarios } from "@/lib/data/scenarios"

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

export default async function KoreanLearningApp() {
  const scenarios = await getScenarios()

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
              <Link key={scenario.id} href={`/scenario/${scenario.id}`}>
                <Card className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 relative overflow-hidden group bg-card border-border">
                  <CardContent className="p-6">
                    {scenario.is_free === 1 && (
                      <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">FREE</Badge>
                    )}
                    <div className="text-5xl mb-4 text-center group-hover:scale-110 transition-transform">
                      {scenario.emoji}
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-balance text-card-foreground">{scenario.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{scenario.title_en}</p>
                  </CardContent>
                </Card>
              </Link>
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
