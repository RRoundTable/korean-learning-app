'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, Star, Trophy, Sparkles, Target, BookOpen, MessageSquare, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  EvaluationResponse,
  EVALUATION_AXES,
  LEVEL_INFO,
  calculateOverallLevel,
  getScoreColor,
  getScoreBgColor
} from '@/lib/types/evaluation'

interface EvaluationResultsPopupProps {
  isOpen: boolean
  onClose: () => void
  evaluationData: EvaluationResponse | null
  isLoading?: boolean
}

export function EvaluationResultsPopup({
  isOpen,
  onClose,
  evaluationData,
  isLoading = false
}: EvaluationResultsPopupProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({})

  useEffect(() => {
    if (evaluationData && isOpen) {
      // 점수 애니메이션을 위한 초기화
      const initialScores: Record<string, number> = {}
      Object.keys(evaluationData.axes).forEach(key => {
        initialScores[key] = 0
      })
      setAnimatedScores(initialScores)

      // 순차적으로 점수 애니메이션
      const animateScores = () => {
        Object.entries(evaluationData.axes).forEach(([key, value], index) => {
          setTimeout(() => {
            setAnimatedScores(prev => ({
              ...prev,
              [key]: value.score
            }))
          }, index * 200)
        })
      }

      setTimeout(animateScores, 500)
    }
  }, [evaluationData, isOpen])

  if (!isOpen) return null

  const overallLevel = evaluationData ? calculateOverallLevel({
    task: evaluationData.axes.task.score,
    grammar: evaluationData.axes.grammar.score,
    lexicon: evaluationData.axes.lexicon.score,
    pragmatics: evaluationData.axes.pragmatics.score
  }) : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-card border-2 border-primary/20 shadow-2xl">
            <CardContent className="p-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-card-foreground">
                    대화 완료!
                  </h2>
                  <p className="text-card-foreground/80">
                    한국어 레벨 평가 결과입니다
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-card-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-card-foreground/80">평가 중...</span>
              </div>
            ) : evaluationData && overallLevel ? (
              <>
                {/* 종합 레벨 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 mb-6"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="inline-flex items-center gap-2 mb-2"
                    >
                      <Star className="h-6 w-6 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {overallLevel.level}
                      </span>
                    </motion.div>
                    <h3 className="text-xl font-semibold mb-1 text-card-foreground">
                      {LEVEL_INFO[overallLevel.level].name}
                    </h3>
                    <p className="text-card-foreground/80">
                      {LEVEL_INFO[overallLevel.level].description}
                    </p>
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">
                        평균 점수: {overallLevel.average.toFixed(1)}/4.0
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* 평가 축별 점수 */}
                <div className="space-y-4 mb-6">
                  {EVALUATION_AXES.map((axis, index) => {
                    const axisData = evaluationData.axes[axis.key]
                    const animatedScore = animatedScores[axis.key] || 0
                    const scoreColor = getScoreColor(axisData.score)

                    // 아이콘 매핑
                    const axisIcons = {
                      task: Target,
                      grammar: BookOpen,
                      lexicon: MessageSquare,
                      pragmatics: Users
                    }
                    const IconComponent = axisIcons[axis.key]

                    return (
                      <motion.div
                        key={axis.key}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="bg-muted/30 rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <IconComponent className={`h-5 w-5 ${axis.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-card-foreground">
                                {axis.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {axis.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-card-foreground">
                              {animatedScore.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              / 4.0
                            </div>
                          </div>
                        </div>
                        <Progress
                          value={(animatedScore / 4) * 100}
                          className="h-2"
                        />
                      </motion.div>
                    )
                  })}
                </div>

                {/* 상세 정보 토글 */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full border-border hover:bg-muted"
                  >
                    {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'}
                  </Button>
                </div>

                {/* 상세 정보 */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {EVALUATION_AXES.map((axis) => {
                        const axisData = evaluationData.axes[axis.key]
                        const hasErrors = axisData.error_examples && axisData.error_examples.length > 0

                        return (
                          <Card key={axis.key} className="border border-border">
                            <CardHeader>
                              <CardTitle className={`text-lg ${axis.color}`}>
                                {axis.name} 상세 분석
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {hasErrors ? (
                                <div>
                                  <h4 className="font-medium mb-2 text-card-foreground">
                                    개선점:
                                  </h4>
                                  <ul className="space-y-1">
                                    {axisData.error_examples.map((error, index) => (
                                      <li key={index} className="flex items-start gap-2 text-sm">
                                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-muted-foreground">{error}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="text-sm">훌륭합니다! 개선할 점이 없습니다.</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 액션 버튼 */}
                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={onClose}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    확인
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: 재시도 기능 구현
                      console.log('재시도')
                    }}
                    className="flex-1 border-border hover:bg-muted"
                  >
                    다시 시도
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-card-foreground/80">평가 데이터를 불러올 수 없습니다.</p>
              </div>
            )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
