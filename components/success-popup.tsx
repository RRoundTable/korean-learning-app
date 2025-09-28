"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Sparkles } from "lucide-react"

interface SuccessPopupProps {
  isOpen: boolean
  onClose: () => void
  onAnalyze: () => void
}

export function SuccessPopup({ isOpen, onClose, onAnalyze }: SuccessPopupProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][
                    Math.floor(Math.random() * 6)
                  ],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <Card className="w-full max-w-md mx-auto bg-card border-2 border-primary/20 shadow-2xl">
        <CardContent className="p-8 text-center">
          {/* Trophy Icon with Sparkles */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Trophy className="w-12 h-12 text-primary" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
            <Sparkles
              className="absolute -bottom-2 -left-2 w-4 h-4 text-yellow-500 animate-pulse"
              style={{ animationDelay: "0.5s" }}
            />
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-card-foreground mb-2">축하합니다!</h2>
          <p className="text-lg text-card-foreground/80 mb-6">모든 테스크를 완료했습니다.</p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onAnalyze}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
            >
              대화 분석 보기
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full border-border text-card-foreground hover:bg-muted bg-transparent"
            >
              닫기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
